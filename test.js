import addWatermark from './src/addWatermark.js';

const inputVideoPath = './path/to/input/video.mp4';
const watermarkPath = './path/to/watermark.png';

const options = {
    position: 'top-left',
    margin: 30,
    opacity: 0.5,
    watermarkScalePercentage: 10
};

(async () => {
    try {
        const result = await addWatermark(inputVideoPath, watermarkPath, options);
        console.log('Watermark added successfully:', result);
    } catch (error) {
        console.error('Error adding watermark:', error);
    }
})();



// addWatermark(inputVideoPath, watermarkPath, options, (error, result) => {
//     if (error) {
//         console.error('Error adding watermark:', error);
//     } else {
//         console.log('Watermark added successfully:', result);
//     }
// });