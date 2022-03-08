import { basename, join as pathJoin } from 'path';
import { v4 as uuid } from 'uuid';
import { lookup } from 'mime-types';

export function isUrl(str: string) {
  return /^http(s?)\:\/\//.test(str);
}

export function isHttps(str: string) {
  if (isUrl(str)) {
    let url = new URL(str);
    if (url.protocol === 'https:') {
      return true;
    }
  }

  return false;
}

/**
 * Get file name from a string URL
 */
export function getFileName(str: string) {
  let url = new URL(str);
  return basename(url.pathname);
}

/**
 * Get file extension (with ".") from a string URL
 */
export function getFileExt(str: string) {
  let match =  getFileName(str).match(/\.[0-9a-zA-Z]+$/i);
  if (match && match.length) {
    return match[0];
  } else {
    return '';
  }
}

export function getTempFileLocation(str: string) {
  let fileName =  getFileName(str);
  if (fileName.length > 40) {
    fileName = fileName.substring(fileName.length - 40);
  }
  return pathJoin(process.cwd(), 'temp', uuid().substring(24) + fileName);
}

/**
 * Get content type based on file 
 */
export function getContentType(filepath: string) {
  return lookup(basename(filepath));
}