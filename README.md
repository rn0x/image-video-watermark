### image-video-watermark

This module allows you to add watermarks to images or videos using Node.js.

#### Installation

Make sure you have Node.js installed (version 10 or above) and FFmpeg installed on your system.

```bash
npm install image-video-watermark
```

Or

```bash
yarn add image-video-watermark
```

#### Usage

```javascript
import addWatermark from 'image-video-watermark';

// Path to the original file
const inputPath = './path/to/input/file';

// Path to the watermark image
const watermarkPath = './path/to/watermark/image.png';

// Optional options
const options = {
  position: 'bottom-right', // Watermark position ('top-right', 'bottom-right', 'top-left', 'bottom-left')
  margin: 20, // Margin between watermark and video/image edge (default is 10)
  opacity: 0.7, // Opacity of the watermark (value between 0 and 1, default is 0.5)
  watermarkScalePercentage: 15 // Percentage scale of the watermark (default is 10)
};

// Adding watermark to image or video
(async () => {
  try {
    const result = await addWatermark(inputPath, watermarkPath, options);
    console.log('Watermark added successfully:', result);
  } catch (error) {
    console.error('Error adding watermark:', error);
  }
})();
```

### System Requirements

- Node.js 10 or above.
- FFmpeg installed on your system.

#### Example with Telegraf

```javascript
import { Telegraf } from 'telegraf';
import addWatermark from 'image-video-watermark';

const bot = new Telegraf('YOUR_BOT_TOKEN');

bot.on('document', async (ctx) => {
  const fileId = ctx.message.document.file_id;
  const watermarkPath = './path/to/watermark/image.png';

  try {
    const file = await ctx.telegram.getFile(fileId);
    const inputPath = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    const options = {
      position: 'bottom-right',
      margin: 20,
      opacity: 0.7,
      watermarkScalePercentage: 15
    };

    const result = await addWatermark(inputPath, watermarkPath, options);
    console.log('Watermark added to Telegram file:', result);

    // Send the watermarked file back to user
    await ctx.replyWithDocument({ source: result.buffer });
  } catch (error) {
    console.error('Error processing Telegram file:', error);
  }
});

bot.launch();
```

#### Example with Express

```javascript
import express from 'express';
import multer from 'multer';
import addWatermark from 'image-video-watermark';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  const inputPath = req.file.path;
  const watermarkPath = './path/to/watermark/image.png';

  try {
    const options = {
      position: 'bottom-right',
      margin: 20,
      opacity: 0.7,
      watermarkScalePercentage: 15
    };

    const result = await addWatermark(inputPath, watermarkPath, options);
    console.log('Watermark added to uploaded file:', result);

    res.set('Content-Type', 'image/jpeg');
    res.send(result.buffer);
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).send('Error processing file');
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

### Contributing

If you would like to contribute to this project, please fork the repository and open a pull request.

### Support

If you encounter any issues or have questions, please open an issue on [GitHub issues](https://github.com/rn0x/image-video-watermark/issues).

### License

This project is licensed under the [MIT License](./LICENSE).

---

Make sure to replace `'./path/to/input/file'` and `'./path/to/watermark/image.png'` with actual paths to your input file and watermark image respectively.