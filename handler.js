'use strict';

// aws-sdk is automatically included by Lambda environment
const AWS = require('aws-sdk');
// packages from layer
const fetch = require('node-fetch');
const imageType = require('image-type');
const { v4: uuid } = require('uuid');

// name of your S3 bucket
const BUCKET = process.env.BUCKET;
// folder in bucket where files are saved
const UPLOAD_PATH = 'original/';
// max allowed image size
const MAX_FILE_SIZE = 1024 * 1024 * 12; // 12MB
// allowed image file types
const ALLOWED_TYPES = ['jpg', 'png', 'bmp'];

const s3 = new AWS.S3();

// helper return function
const createReturnObject = (body, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(body),
});

// main lambda function handler
module.exports.fetchStoreImage = async (event) => {
  let { url } = JSON.parse(event.body);

  if (!url) {
    return createReturnObject({
      success: false,
      errorCode: 'missing_url_param'
    });
  }

  const response = await fetch(url);

  if (!response.ok) {
    return createReturnObject({
      success: false,
      errorCode: 'fetch_failed'
    });
  }

  const buffer = await response.buffer();

  if (buffer.byteLength > MAX_FILE_SIZE) {
    return createReturnObject({
      success: false,
      errorCode: 'too_big'
    });
  }

  const type = imageType(buffer);

  if (!type) {
    return createReturnObject({
      success: false,
      errorCode: 'not_image'
    });
  }

  if (!ALLOWED_TYPES.includes(type.ext)) {
    return createReturnObject({
      success: false,
      errorCode: 'not_supported_filetype'
    });
  }

  const key = `${UPLOAD_PATH}${uuid()}.${type.ext}`;

  const result = await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
  }).promise();

  if (!result.ETag) {
    return createReturnObject({
      success: false,
      errorCode: 'saving_failed'
    });
  }

  return createReturnObject({
    success: true,
    key
  });
};
