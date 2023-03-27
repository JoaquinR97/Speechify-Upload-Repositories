// Enter login information here and base directory:

const USER_EMAIL = "jrevello98@gmail.com"; // Enter Email Here
const USER_PASSWORD = "password123"; // Enter Password Here
const BASE_FILE_DIRECTORY = "./../Your Folder"; // Enter the location to the base folder
const HOME_PAGE_FOLDER =
  "https://app.speechify.com/?page=1&folder=54a38fea-3d65-409c-83b4-c99dea99f4cf"; // Enter URL of base folder on Speechify

// ---- //
// ---- //
// ---- //

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const {
  CatchFolderErrorAsync,
  CatchFileErrorAsync,
  CatchRecursionErrorAsync,
  CatchMainFunctionErrorAsync,
} = require("./errorHandling/functionErrorWrappers");

const clickButtonText = async (Text, page) => {
  const buttons = await page.$$("button");

  // Loop through the buttons and click the one with the desired text content
  for (const button of buttons) {
    const textContent = await button.evaluate((el) => el.textContent);
    if (textContent === Text) {
      await button.click();
      break;
    }
  }
};

const addFolder = CatchFolderErrorAsync(
  async (folderName, folderParentURL, page) => {
    // Go to page to make folder
    await page.goto(folderParentURL);

    // Make the three dots hiddent
    await page.waitForSelector("button.rounded.hover\\:bg-glass-300", {
      visible: true,
    });

    await page.evaluate(() => {
      const elements = document.querySelectorAll(
        ".rounded.hover\\:bg-glass-300"
      );
      elements.forEach((element) => {
        element.style.display = "none";
      });
    });

    // Click on arrow
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.click(".w-4.h-4.ml-0.text-gray-400.cursor-pointer");
    //   clickButtonText("Open options", page);

    // Click on make new folder
    await new Promise((resolve) => setTimeout(resolve, 2000));
    clickButtonText("New Folder", page);

    // Clicks and creates new folder
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const createFolderElement = await page.$('input[name="name"]', {
      delay: 100,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    await createFolderElement.type(folderName, {
      delay: 100,
    });
    await page.click('button[type="submit"]');

    // Now click on newly created folder
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // To do so, we will need to convert the view into a file stack view. So we need to unhide it again
    await page.evaluate(() => {
      const elements = document.querySelectorAll(
        ".rounded.hover\\:bg-glass-300"
      );
      elements.forEach((element) => {
        element.style.display = "block";
      });
    });

    await page.waitForSelector("button.rounded.hover\\:bg-glass-300", {
      visible: true,
    });

    const threeButtons = await page.$$("button.rounded.hover\\:bg-glass-300");

    // Click on the third button
    await threeButtons[2].click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    clickButtonText("List view", page);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const barElement = await page.$('li[class="h-[51px]"]');
    await barElement.click();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Click on newly created folder and return url inside said folder
    return await page.url();
  }
);

const addFile = CatchFileErrorAsync(async (fileDirectory, page) => {
  // Return to this page right after
  const folderPageUrl = await page.url();

  // Minimize pop-up
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // In the case that the pop up no longer exists, continue without error
  await page.click(
    'svg[width="16"][height="16"][viewBox="0 0 14 14"][fill="#ff0000"]'
  );

  // Click on the new button
  await new Promise((resolve) => setTimeout(resolve, 3000));
  clickButtonText("New", page);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  clickButtonText("Local Documents", page);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(), // wait for the file chooser dialog to open
    clickButtonText("browse files", page), // click the file input button
  ]);

  await fileChooser.accept([fileDirectory]);

  // Wait for the page to load properly and add some buffer time after loaded
  await page.waitForSelector(
    ".relative.flex.h-16.items-center.justify-between"
  );
  await new Promise((resolve) => setTimeout(resolve, 7500));

  // Goto folder starting page
  await page.goto(folderPageUrl);
});

const recurseFileUploads = CatchRecursionErrorAsync(
  async (page, directoryStarting, parentURL) => {
    // Read files in chronological ordering
    const results = fs
      .readdirSync(directoryStarting)
      .map((file) => ({
        name: file,
        created: fs
          .statSync(path.join(directoryStarting, file))
          .birthtime.getTime(),
      }))
      .sort((a, b) => a.created - b.created)
      .map((file) => file.name);

    // Array containing the name of all files in the directory
    let files = [];

    // Filter out all the folders and files
    const folders = results.filter((file) => {
      if (fs.lstatSync(`${directoryStarting}/${file}`).isDirectory()) {
        return true;
      } else {
        files.push(file);
        return false;
      }
    });

    // Add file to Speechify
    for (const file of files) {
      await addFile(`${directoryStarting}/${file}`, page);
    }

    // Add folder to Speechify
    for (const folder of folders) {
      const newUrl = await addFolder(folder, parentURL, page);
      await recurseFileUploads(page, `${directoryStarting}/${folder}`, newUrl);
    }
  }
);

// Startup browser function
const launchBrowser = async () => {
  return await new Promise((resolve, reject) => {
    try {
      const browserOutput = puppeteer.launch({ headless: true });
      resolve(browserOutput);
    } catch (err) {
      reject(err);
    }
  });
};

// MAIN FUNCTION: Upload File Directory to Speechify
CatchMainFunctionErrorAsync(launchBrowser, async (browser) => {
  const page = await browser.newPage();

  // Go to website login page
  await page.goto(
    "https://app.speechify.com/login?returnTo=https%3A%2F%2Fapp.speechify.com%2F"
  );

  // Wait for 1 seconds
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get email element to then type
  const emailElement = await page.$('input[name="email"]', {
    delay: 100,
  });
  await emailElement.type(USER_EMAIL);

  // Get passowrd element to then type
  const passwordElement = await page.$('input[name="password"]', {
    delay: 100,
  });
  await passwordElement.type(USER_PASSWORD);

  // Get and click on button
  clickButtonText("Sign In", page);

  // Wait for page to move
  await new Promise((resolve) => setTimeout(resolve, 5000));

  page.goto(HOME_PAGE_FOLDER);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Add folder and file recurse through my file folder
  await recurseFileUploads(page, BASE_FILE_DIRECTORY, HOME_PAGE_FOLDER);
})();
