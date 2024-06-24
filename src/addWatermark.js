import Jimp from 'jimp';
import fs from 'fs';
import { promisify } from 'util';
import { spawn } from 'child_process';
import which from 'which';
import path from 'path';

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const readFileAsync = fs.promises.readFile;
const unlinkAsync = fs.promises.unlink;

let ffmpegPath = 'ffmpeg';

/**
 * Adds a watermark to an image or video file.
 * @param {string} inputPath - Path to the file containing the image or video.
 * @param {string} watermarkPath - Path to the watermark file (image).
 * @param {object} options - Optional parameters to control parameters like watermark position, size change.
 * @param {string} options.position - Watermark position ('top-right', 'bottom-right', 'top-left', 'bottom-left').
 * @param {number} options.margin - Margin between watermark and video edge (default is 10).
 * @param {number} options.opacity - Opacity of the watermark (value between 0 and 1, default is 0.5).
 * @param {number} options.watermarkScalePercentage - Percentage scale of the watermark.
 * @param {function} callback - Function to handle completion or error (optional).
 * @returns {Promise<object>} - Object containing buffer of the output file and additional information.
 */
async function addWatermark(inputPath, watermarkPath, options = {}, callback) {
  const {
    position = 'bottom-right',
    margin = 10,
    opacity = 0.5,
    watermarkScalePercentage = 10
  } = options;

  let imageType;
  if (inputPath.toLowerCase().endsWith('.mp4') || inputPath.toLowerCase().endsWith('.avi') || inputPath.toLowerCase().endsWith('.mov')) {
    imageType = 'video';
  } else {
    imageType = 'image';
  }

  // Define output directory relative to project root
  const outputDir = path.join(process.cwd(), 'output');
  // Check if output directory exists, create if not
  try {
    await stat(outputDir);
  } catch (err) {
    await mkdir(outputDir, { recursive: true });
  }

  if (imageType === 'image') {
    try {
      let image = await Jimp.read(inputPath);
      let watermark = await Jimp.read(watermarkPath);

      // Calculate the scale factor based on percentage
      const scaleFactor = watermarkScalePercentage / 100;
      // Resize watermark accordingly
      const newWidth = watermark.bitmap.width * scaleFactor;
      const newHeight = watermark.bitmap.height * scaleFactor;
      watermark.resize(newWidth, newHeight);

      let x, y;
      switch (position) {
        case 'top-right':
          x = image.bitmap.width - watermark.bitmap.width - margin;
          y = margin;
          break;
        case 'bottom-right':
          x = image.bitmap.width - watermark.bitmap.width - margin;
          y = image.bitmap.height - watermark.bitmap.height - margin;
          break;
        case 'top-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-left':
          x = margin;
          y = image.bitmap.height - watermark.bitmap.height - margin;
          break;
        default:
          x = image.bitmap.width - watermark.bitmap.width - margin;
          y = image.bitmap.height - watermark.bitmap.height - margin;
          break;
      }

      // Composite watermark onto the image
      image.composite(watermark, x, y, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: opacity,
      });

      // Extract filename from inputPath
      const filename = path.basename(inputPath);
      const outputFileName = filename.replace(/\.[^.]+$/, '') + '.output.jpg';

      // Define final output path
      const finalOutputPath = path.join(outputDir, outputFileName);

      // Write the manipulated image to disk
      await image.writeAsync(finalOutputPath);
      // Read the output file as buffer
      const outputBuffer = await readFileAsync(finalOutputPath);
      // Delete the output file after reading
      await unlinkAsync(finalOutputPath);

      const result = {
        buffer: outputBuffer,
      };

      // Handle callback if provided
      if (callback && typeof callback === 'function') {
        callback(null, result);
      } else {
        return result;
      }
    } catch (err) {
      // Handle any errors during the process
      if (callback && typeof callback === 'function') {
        callback(err);
      } else {
        throw err;
      }
    }
  } else if (imageType === 'video') {
    try {
      // Check if ffmpeg is installed
      const which_ffmpeg = await which('ffmpeg');
      ffmpegPath = which_ffmpeg;
    } catch (err) {
      const errMessage = 'ffmpeg is not installed on the system. Please install it first.';
      if (callback && typeof callback === 'function') {
        callback(new Error(errMessage));
      } else {
        throw new Error(errMessage);
      }
    }

    // Extract filename from inputPath
    const filename = path.basename(inputPath);
    const outputFileName = filename.replace(/\.[^.]+$/, '') + '.output.mp4';

    // Define output path for the video file
    const finalOutputPath = path.join(outputDir, outputFileName);
    // Define ffmpeg arguments for adding watermark to video
    const ffmpegArgs = [
      '-i', inputPath,
      '-i', watermarkPath,
      '-filter_complex', getOverlayFilter(position, margin, watermarkScalePercentage, opacity),
      '-c:a', 'copy',
      '-y',
      finalOutputPath,
    ];

    return new Promise((resolve, reject) => {
      // Spawn ffmpeg process
      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

      ffmpegProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            // Read the output video file as buffer
            const outputBuffer = await readFileAsync(finalOutputPath);
            // Delete the output video file after reading
            await unlinkAsync(finalOutputPath);

            const result = {
              buffer: outputBuffer
            };

            // Handle callback if provided
            if (callback && typeof callback === 'function') {
              callback(null, result);
            } else {
              resolve(result);
            }
          } catch (err) {
            if (callback && typeof callback === 'function') {
              callback(err);
            } else {
              reject(err);
            }
          }
        } else {
          const errMessage = `Error occurred while adding watermark to the video. Error code: ${code}`;
          if (callback && typeof callback === 'function') {
            callback(new Error(errMessage));
          } else {
            reject(new Error(errMessage));
          }
        }
      });

      // Handle error event of ffmpeg process
      ffmpegProcess.on('error', (err) => {
        if (callback && typeof callback === 'function') {
          callback(err);
        } else {
          reject(err);
        }
      });
    });
  }
}

/**
 * Generates ffmpeg filter_complex string for overlaying watermark on video.
 * @param {string} position - Watermark position ('top-right', 'bottom-right', 'top-left', 'bottom-left').
 * @param {number} margin - Margin between watermark and video edge.
 * @param {number} watermarkScalePercentage - Percentage scale of the watermark.
 * @param {number} opacity - Opacity of the watermark.
 * @returns {string} - Filter complex string for ffmpeg.
 */
function getOverlayFilter(position, margin, watermarkScalePercentage, opacity) {
  const scaleFactor = watermarkScalePercentage / 100;

  let overlayFilter = `[1:v]scale=iw*${scaleFactor}:ih*${scaleFactor},format=rgba,colorchannelmixer=aa=${opacity}[scaled_overlay];`;

  switch (position) {
    case 'top-right':
      overlayFilter += `[0:v][scaled_overlay]overlay=W-w-${margin}:0`;
      break;
    case 'bottom-right':
      overlayFilter += `[0:v][scaled_overlay]overlay=W-w-${margin}:H-h-${margin}`;
      break;
    case 'top-left':
      overlayFilter += `[0:v][scaled_overlay]overlay=${margin}:0`;
      break;
    case 'bottom-left':
      overlayFilter += `[0:v][scaled_overlay]overlay=${margin}:H-h-${margin}`;
      break;
    default:
      overlayFilter += `[0:v][scaled_overlay]overlay=W-w-${margin}:H-h-${margin}`;
      break;
  }

  return overlayFilter;
}

export default addWatermark;