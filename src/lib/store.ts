import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { basename } from 'path';
import { Buffer } from 'buffer';
import { writeFile } from 'fs/promises';
import { createReadStream, rm as fsrm } from 'fs';
import AWS from 'aws-sdk';
import { getConfig } from './config';
import { isHttps, getTempFileLocation, getContentType } from './utils';

const cfg = getConfig();

const s3 = new AWS.S3({
  endpoint: cfg.bucket.endpoint,
  accessKeyId: cfg.bucket.key,
  secretAccessKey: cfg.bucket.secret,
});

function removeFile(location: string) {
  fsrm(location, { recursive: true, maxRetries: 5, retryDelay: 200, force: true }, (err) => {
    if (err) {
      console.error('Error in removing file', err);
    }
  });
}

/**
 * Downloads file from a string URL, returns downloaded file location or false
 */
export function download(url: string): Promise<string | false> {
  let getter = isHttps(url) ? httpsGet : httpGet;

  return new Promise((resolve, reject) => {
    getter(url, (res) => {
      // check status code
      let statusCode = res.statusCode;
      if (!statusCode || !(statusCode >= 200 && statusCode <= 302)) {
        console.error(`HTTP status code is not 2xx, 301, or 302. Status Code: ${statusCode}. URL: ${url}`);
        res.resume(); // to free memory
        return resolve(false);
      }

      // handle redirection
      if ([301, 302].includes(statusCode)) {
        if (res.headers.location) {
          return resolve(download(res.headers.location));
        } else {
          console.error('Redirection without destination');
          return resolve(false);
        }
      }

      // get body
      let buff: Buffer;
      res.on('data', (chunk) => {
        if (buff) {
          buff = Buffer.concat([buff, chunk]);
        } else {
          buff = Buffer.from(chunk);
        }
      });
      res.on('end', () => {
        let location = getTempFileLocation(url);

        writeFile(location, buff)
          .then(() => {
            return resolve(location);
          })
          .catch((reason) => {
            console.error(reason);
            return resolve(false);
          });
      });

    }).on('error', (err) => {
      console.error('HTTP request error');
      return resolve(false);
    });
  });
}

/**
 * Upload a file to specified S3 storage
 */
export function upload(
  location: string,
  opt: { clearOnFail: boolean, clearOnSuccess: boolean } = { clearOnFail: true, clearOnSuccess: true },
): Promise<string | false> {
  return new Promise((resolve, reject) => {
    // init upload parameters
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: cfg.bucket.name, 
      Key: '', 
      Body: '', 
      ACL: 'public-read',
    };

    // check content type
    let contentType = getContentType(location);
    if (contentType) {
      uploadParams.ContentType = contentType;
    }
    
    // Configure the file stream and obtain the upload parameters
    const fileStream = createReadStream(location);
    fileStream.on('error', (err) => {
      console.error('File uploading stream error:', err);
      if (opt.clearOnFail) {
        // remove file
        removeFile(location);
      }
      return resolve(false);
    });
    uploadParams.Body = fileStream;
    uploadParams.Key = basename(location);

    // call S3 to retrieve upload file to specified bucket
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        console.log('S3 uploading error:', err);
        if (opt.clearOnFail) {
          // remove file
          removeFile(location);
        }
        return resolve(false);
      } 

      if (data && data.Location && data.Key) {
        if (opt.clearOnSuccess) {
          // remove file
          removeFile(location);
        }

        let { Location: uploadedLocation, Key: uploadedKey } = data;
        let finalLocation = uploadedLocation;

        if (cfg.bucket.resultForceHttps && !isHttps(uploadedLocation)) {
          finalLocation = uploadedLocation.replace(/^http:\/\//, 'https://');
        }

        if (cfg.bucket.resultBaseUrl) {
          finalLocation = uploadedLocation.replace(new URL(uploadedLocation).origin, cfg.bucket.resultBaseUrl);
        }

        return resolve(finalLocation);
      }

      return resolve(false);
    });
  });
}

/**
 * Re-upload a file from a string URL, returns its new URL location
 */
export async function reupload(url: string): Promise<string | false> {
  try {
    // download
    console.log('downloading...');
    let location = await download(url);
    if (!location) {
      console.error(`File location cannot be retrieved. Location: ${location}`);
      return false;
    }
    
    // upload
    console.log('reuploading...');
    let newUrl = await upload(location);
    if (!newUrl) {
      console.error(`File cannot be uploaded to S3. Previous location: ${location}`);
      return false;
    }
    return newUrl;

  } catch (error) {
    console.error(error);
    return false;
  }
}