import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import beautify from 'js-beautify';
import { exec } from 'child_process';

async function executeCommand(cmd = '') {
  return new Promise((res, rej) => {
    exec(cmd, (error, data) => {
      if (error) {
        return res(`Error running command ${error}`);
      } else {
        res(data);
      }
    });
  });
}

async function downloadAsset(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    await fs.writeFile(destPath, response.data);
    return true;
  } catch (err) {
    console.warn(`Failed to download asset: ${url}`);
    return false;
  }
}

async function cloneWebsite(url = '', customFolderName = '') {
  try {
    const origin = new URL(url);
    const folderName = customFolderName
      ? customFolderName
      : `cloned-${origin.hostname.replace(/\./g, '-')}`;
    await fs.ensureDir(folderName);

    // Launch browser with better settings for modern websites
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set viewport for better rendering
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate with better wait strategy
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content to load
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return new Promise((resolve) => setTimeout(resolve, 3000));
    });

    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    // Enhanced CSS handling for modern websites
    let cssLinks: string[] = [];
    let googleFonts: string[] = [];

    // Collect external CSS
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('fonts.googleapis.com')) {
          googleFonts.push(href);
        } else {
          cssLinks.push(
            href.startsWith('http') ? href : new URL(href, url).href
          );
        }
      }
    });

    // Collect inline styles
    let inlineStyles = '';
    $('style').each((_, el) => {
      inlineStyles += $(el).html() + '\n';
    });

    // Remove old CSS links but keep Google Fonts
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('fonts.googleapis.com')) {
        $(el).remove();
      }
    });

    // Download and concatenate external CSS
    let allCss = '';
    for (const cssUrl of cssLinks) {
      try {
        const cssContent = await axios
          .get(cssUrl, {
            timeout: 10000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          })
          .then((res) => res.data);
        allCss += cssContent + '\n';
      } catch (error) {
        console.warn(`Failed to download CSS: ${cssUrl}`);
      }
    }

    // Add inline styles
    allCss += inlineStyles;

    // Add Google Fonts links back
    googleFonts.forEach((fontLink) => {
      $('head').append(`<link rel="stylesheet" href="${fontLink}">`);
    });

    // Add our main CSS file
    $('head').append('<link rel="stylesheet" href="styles.css">');

    // Enhanced image handling for modern websites
    const imgTags = $('img');
    for (let i = 0; i < imgTags.length; ++i) {
      const img = imgTags[i];
      let src =
        $(img).attr('src') ||
        $(img).attr('data-src') ||
        $(img).attr('data-lazy') ||
        $(img).attr('data-original') ||
        $(img).attr('data-srcset')?.split(' ')[0]; // Handle srcset

      if (!src || src.startsWith('data:image/')) continue;

      const absUrl = src.startsWith('http') ? src : new URL(src, url).href;
      try {
        const imgName =
          path.basename(new URL(absUrl).pathname || '') || `image-${i}.jpg`;
        const imgPath = path.join(folderName, imgName);
        const success = await downloadAsset(absUrl, imgPath);
        if (success) {
          $(img).attr('src', imgName);
          $(img).removeAttr('data-src');
          $(img).removeAttr('data-lazy');
          $(img).removeAttr('data-original');
          $(img).removeAttr('data-srcset');
        }
      } catch (error) {
        console.warn(`Failed to process image: ${absUrl}`);
      }
    }

    // Enhanced background image handling
    const styleElems = $('[style]').toArray();
    for (const el of styleElems) {
      const style = $(el).attr('style');
      if (!style) continue;

      // Handle multiple background patterns
      const bgRegex = /background(?:-image)?:.*?url\(["']?(.*?)["']?\)/g;
      let match;
      let newStyle = style;

      while ((match = bgRegex.exec(style)) !== null) {
        if (match[1] && !match[1].startsWith('data:image/')) {
          let bgUrl = match[1].startsWith('http')
            ? match[1]
            : new URL(match[1], url).href;
          try {
            const imgName =
              path.basename(new URL(bgUrl).pathname || '') ||
              `bg-${Date.now()}.jpg`;
            const imgPath = path.join(folderName, imgName);
            const success = await downloadAsset(bgUrl, imgPath);
            if (success) {
              newStyle = newStyle.replace(match[1], imgName);
            }
          } catch (error) {
            console.warn(`Failed to process background image: ${bgUrl}`);
          }
        }
      }

      if (newStyle !== style) {
        $(el).attr('style', newStyle);
      }
    }

    // Enhanced SVG handling
    const svgImages = $('image').toArray();
    for (const el of svgImages) {
      const href = $(el).attr('href') || $(el).attr('xlink:href');
      if (href && !href.startsWith('data:image/')) {
        let svgUrl = href.startsWith('http') ? href : new URL(href, url).href;
        try {
          const imgName =
            path.basename(new URL(svgUrl).pathname || '') ||
            `svg-${Date.now()}.svg`;
          const imgPath = path.join(folderName, imgName);
          const success = await downloadAsset(svgUrl, imgPath);
          if (success) {
            $(el).attr('href', imgName);
            $(el).attr('xlink:href', imgName);
          }
        } catch (error) {
          console.warn(`Failed to process SVG: ${svgUrl}`);
        }
      }
    }

    // Enhanced CSS image URL processing
    const urlRegex = /url\(["']?(.*?)["']?\)/g;
    const cssImageLinks = [...allCss.matchAll(urlRegex)].map(
      (match) => match[1]
    );

    for (const cssImgUrl of cssImageLinks) {
      if (
        !cssImgUrl ||
        cssImgUrl.startsWith('data:image/') ||
        cssImgUrl.startsWith('#')
      )
        continue;

      const fullUrl = cssImgUrl.startsWith('http')
        ? cssImgUrl
        : new URL(cssImgUrl, url).href;
      try {
        const imgName =
          path.basename(new URL(fullUrl).pathname || '') ||
          `css-img-${Date.now()}.jpg`;
        const imgPath = path.join(folderName, imgName);
        const success = await downloadAsset(fullUrl, imgPath);
        if (success) {
          // Escape special characters for regex replacement
          const escapedUrl = cssImgUrl.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            '\\$&'
          );
          allCss = allCss.replace(new RegExp(escapedUrl, 'g'), imgName);
        }
      } catch (error) {
        console.warn(`Failed to process CSS image: ${fullUrl}`);
      }
    }

    // Handle JavaScript files for interactive elements
    let jsFiles: string[] = [];
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:')) {
        jsFiles.push(src.startsWith('http') ? src : new URL(src, url).href);
      }
    });

    // Download JavaScript files
    for (let i = 0; i < jsFiles.length; i++) {
      try {
        const jsUrl = jsFiles[i];
        if (!jsUrl) continue;

        const jsContent = await axios
          .get(jsUrl, {
            timeout: 10000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          })
          .then((res) => res.data);

        const pathname = new URL(jsUrl).pathname || '';
        const jsName = path.basename(pathname) || `script-${i}.js`;
        const jsPath = path.join(folderName, jsName);
        await fs.writeFile(jsPath, jsContent);

        // Update script src in HTML
        const scriptSelector = `script[src="${jsFiles[i]}"]`;
        $(scriptSelector).attr('src', jsName);
      } catch (error) {
        console.warn(`Failed to download JavaScript: ${jsFiles[i]}`);
      }
    }

    // Clean up HTML for better compatibility
    $('script[src*="google-analytics"]').remove();
    $('script[src*="googletagmanager"]').remove();
    $('script[src*="facebook"]').remove();
    $('noscript').remove();

    // Remove meta tags that might cause issues
    $('meta[http-equiv="refresh"]').remove();
    $('meta[name="robots"]').remove();

    // Beautify and save files
    const beautifiedHtml = beautify.html($.html(), {
      indent_size: 2,
      wrap_line_length: 120,
      preserve_newlines: true,
    });
    const beautifiedCss = beautify.css(allCss, {
      indent_size: 2,
      wrap_line_length: 120,
    });

    await fs.writeFile(path.join(folderName, 'index.html'), beautifiedHtml);
    await fs.writeFile(path.join(folderName, 'styles.css'), beautifiedCss);

    // Create a simple README
    const readmeContent = `# Cloned Website: ${origin.hostname}

This folder contains a cloned version of ${url}

## Files:
- \`index.html\` - The main HTML file
- \`styles.css\` - All CSS styles
- Various image and asset files

## To view:
Open \`index.html\` in your web browser.

## Note:
This is a static clone. Interactive features may not work as expected.
`;

    await fs.writeFile(path.join(folderName, 'README.md'), readmeContent);

    return `Website cloned successfully! Files saved in ./${folderName}/ including index.html, styles.css, JavaScript files, and all assets.`;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return `Error cloning website: ${errorMessage}`;
  }
}

const TOOL_MAP = {
  executeCommand,
  cloneWebsite,
};

const client = new OpenAI();

async function main() {
  const SYSTEM_PROMPT = `
    You are an AI assistant who works on START, THINK and OUTPUT format.
    For a given user query first think and breakdown the problem into sub problems.
    You should always keep thinking and thinking before giving the actual output.

    Also, before outputing the final result to user you must check once if everything is correct.
    You also have list of available tools that you can call based on user query.

    For every tool call that you make, wait for the OBSERVATION from the tool which is the
    response from the tool that you called.

    Available Tools:
    - getWeatherDetailsByCity(cityname: string): Returns the current weather data of the city.
    - getGithubUserInfoByUsername(username: string): Retuns the public info about the github user using github api
    - executeCommand(command: string): Takes a linux / unix command as arg and executes the command on user's machine and returns the output
    - cloneWebsite(url: string, folderName?: string): Clones the exact UI of the specified website using scraping tools. Creates a folder and generates html and css files to replicate the site's appearance.

    Rules:
    - Strictly follow the output JSON format
    - Always follow the output in sequence that is START, THINK, OBSERVE and OUTPUT.
    - Always perform only one step at a time and wait for other step.
    - Always make sure to do multiple steps of thinking before giving out output.
    - For every tool call always wait for the OBSERVATION which contains the output from tool
    - Always return code files as multi-line code blocks, not as JSON strings or with escaped newlines.

    Output JSON Format:
    { "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": "STRING" }

    Example:
    User: Can you clone https://example.com?
    ASSISTANT: { "step": "START", "content": "The user wants to clone the website at https://example.com" }
    ASSISTANT: { "step": "THINK", "content": "I need to see if there is an available tool to clone website UI" }
    ASSISTANT: { "step": "THINK", "content": "I see cloneWebsite tool that can scrape and recreate the site files using puppeteer and cheerio" }
    ASSISTANT: { "step": "TOOL", "input": "{\\"url\\":\\"https://example.com\\",\\"folderName\\":\\"example-folder\\"}", "tool_name": "cloneWebsite" }
    DEVELOPER: { "step": "OBSERVATION", "content": "Website cloned. Files index.html, styles.css, and script.js are created in ./example-folder/" }
    ASSISTANT: { "step": "THINK", "content": "I successfully cloned the site's UI and saved the files" }
    ASSISTANT: { "step": "OUTPUT", "content": "The site https://example.com has been cloned. You can find the files in ./example-folder/" }
  `;

  // Get command line arguments
  const args = process.argv.slice(2);
  const url = args[0] || 'https://www.google.com/';
  const folderName =
    args[1] || `cloned-${new URL(url).hostname.replace(/\./g, '-')}`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Hey, create a clone of ${url} using html and css and save it in a folder named ${folderName}`,
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    });

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No response from OpenAI');
    }

    const rawContent = choice.message.content;
    if (!rawContent) {
      throw new Error('No content in OpenAI response');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Raw content was:', rawContent);
      throw new Error(
        `Invalid JSON response from OpenAI: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    messages.push({
      role: 'assistant',
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === 'START') {
      console.log(`🔥`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'THINK') {
      console.log(`\t🧠`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'TOOL') {
      const toolToCall = parsedContent.tool_name as keyof typeof TOOL_MAP;
      if (!TOOL_MAP[toolToCall]) {
        messages.push({
          role: 'developer',
          content: `There is no such tool as ${toolToCall}`,
        });
        continue;
      }

      let toolInput = parsedContent.input;
      if (toolToCall === 'cloneWebsite') {
        try {
          const parsedInput = JSON.parse(toolInput);
          if (parsedInput.url && parsedInput.folderName) {
            toolInput = [parsedInput.url, parsedInput.folderName];
          } else if (parsedInput.url) {
            toolInput = [parsedInput.url];
          } else {
            toolInput = [toolInput];
          }
        } catch {
          toolInput = [toolInput];
        }
        const responseFromTool = await TOOL_MAP[toolToCall](...toolInput);
        console.log(`🛠️: ${toolToCall}(${toolInput}) =`, responseFromTool);
        messages.push({
          role: 'developer',
          content: JSON.stringify({
            step: 'OBSERVATION',
            content: responseFromTool,
          }),
        });
        continue;
      }

      const responseFromTool = await TOOL_MAP[toolToCall](toolInput);
      console.log(`🛠️: ${toolToCall}(${toolInput}) = `, responseFromTool);
      messages.push({
        role: 'developer',
        content: JSON.stringify({
          step: 'OBSERVATION',
          content: responseFromTool,
        }),
      });
      continue;
    }

    if (parsedContent.step === 'OUTPUT') {
      console.log(`🤖`, parsedContent.content);
      break;
    }
  }

  console.log('Done...');
}

main();
