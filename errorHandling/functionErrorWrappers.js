// To prevent double console log as error propegates up
let errorThrown = false;

const CatchFolderErrorAsync = (fn) => {
  return async (folderName, folderParentURL, page) => {
    try {
      await fn(folderName, folderParentURL, page);
    } catch (err) {
      errorThrown = true;
      throw new Error(
        `Error occurred while adding folder into folder: "${folderName}" at URL: "${folderParentURL}".\n Error Message: "${err.message}"\n Error Stack: "${err.stack}"`
      );
    }
  };
};

const CatchFileErrorAsync = (fn) => {
  return async (fileDirectory, page) => {
    try {
      await fn(fileDirectory, page);
    } catch (err) {
      errorThrown = true;
      const fileName = fileDirectory.split("/").at(-1);
      throw new Error(
        `Error occurred while adding the file: "${fileName}" at directory: "${fileDirectory}".\n Error Message: "${err.message}"\n Error Stack: "${err.stack}"`
      );
    }
  };
};

const CatchRecursionErrorAsync = (fn) => {
  return async (page, directoryStarting, parentURL) => {
    try {
      await fn(page, directoryStarting, parentURL);
    } catch (err) {
      errorThrown = true;
      throw new Error(
        `Error occurred while searching for files to recurse. Likely an fs error.\n Error Message: "${err.message}"\n Error Stack: "${err.stack}"`
      );
    }
  };
};

const CatchMainFunctionErrorAsync = (launchfn, fn) => {
  return async () => {
    let browser;
    try {
      browser = await launchfn();
      await fn(browser);
    } catch (err) {
      if (!errorThrown) {
        throw new Error(
          `Error occurred in main function: ${err.message}\n Error Stack: "${err.stack}"`
        );
      }
    } finally {
      if (browser) {
        await browser.close();
      }
      process.on("unhandledRejection", (err) => {
        console.error(err.message);
        process.exit(1);
      });
    }
  };
};

module.exports = {
  CatchFolderErrorAsync,
  CatchFileErrorAsync,
  CatchRecursionErrorAsync,
  CatchMainFunctionErrorAsync,
};
