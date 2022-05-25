import { basename, join as pathJoin } from 'path';
import { v4 as uuid } from 'uuid';
import { lookup } from 'mime-types';

export function isUrl(str: string) {
  return typeof str === 'string' && /^http(s?)\:\/\//.test(str);
}

export function isHttps(str: string) {
  if (isUrl(str)) {
    let url = new URL(str);
    return url.protocol === 'https:';
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

export function getObjectFromJson(json: any): { [prop: string]: any }[] | { [prop: string]: any }  | string[] | false {
  if (typeof json !== 'string') {
    return false;
  }

  try {
    const obj = JSON.parse(json);
    return obj;
  } catch (error) {
    return false;
  }
}

function isPropExist(obj: any, propNames: string[]): boolean {
  if (typeof obj !== 'object') {
    return false;
  }

  let val: any = { ...obj };

  for (let i in propNames) {
    if (val.hasOwnProperty(propNames[i])) {
      val = val[propNames[i]];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Returns properties that exist in an object.
 * A property can be a child property specified by combining the value with all predecessors, separated by ".".
 * eg. images.large.url
 */
export function getExistProps(obj: any, props: string[]): string[] {
  let existProps: string[];
  
  existProps = props.filter((prop) => {
    let propNames = prop.split('.');
    return isPropExist(obj, propNames);
  });

  return existProps;
}

/**
 * Compares first level values of two arrays then
 * Results the differences
 */
export function getChanges(sources: any[], references: any[]) {
  return sources.filter((item, i) => {
    return references[i] !== item;
  });
}

/**
 * Get values of specified properties.
 * A property can be a child property specified by combining the value with all predecessors, separated by ".".
 * eg. images.large.url
 */
export function getValuesFromObject(obj: any, props: string[]): any[] {
  if (typeof obj !== 'object') {
    return [];
  }

  let files: string[];

  files = props.map((prop) => {
    let propNames = prop.split('.');
    let val: any = { ...obj };

    for (let i in propNames) {
      val = val[propNames[i]];
    }

    return val;
  });

  return files;
}

/**
 * Update values of specific properties in an object.
 * A property can be a child property specified by combining the value with all predecessors, separated by ".".
 * eg. images.large.url
 * The number and order of the values must match with the number and order of the properties.
 */
export function getAppendedObject(obj: any, props: string[], values: string[]): any {
  let updated = { ...obj };

  props.forEach((prop, i) => {
    let propNames = prop.split('.');
    let objValues: any[] = [];

    // get property values per level, parent to descendants
    propNames.forEach((name, j) => {
      if (j > 0) {
        objValues.push(objValues[j - 1][name]);
      } else {
        objValues.push(updated[name]);
      }
    });

    // reconstruct object, child to predecessors
    let temp: any = {};
    let firstName: string = propNames[0];
    objValues.reverse();
    propNames.reverse().forEach((name, j) => {
      if (j > 0) {
        temp = {
          [name]: {
            ...objValues[j],
            ...temp,
          },
        };
      } else {
        temp = {
          [name]: values[i],
        };
      }
    });

    updated = {
      ...updated,
      [firstName]: temp[firstName],
    };
  });

  return updated;
}