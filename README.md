# Autonomi Chrome Extension

![Autonomi Chrome Extension Page](https://github.com/SafeMedia/images/blob/main/impossible_futures/autonomi-extension-page.png)

This extension will be published on the store once development is complete. Until then you can use it in beta by following these instructions.

To build your extension for testing, run:

```bash
yarn run build
```
or
```bash
npm run build
```

This will generate a dist folder in your project folder.

You can now go to the extensions page in your chromium browser. (chrome, brave etc)

From here you need to enable developer mode. Then you can click the 'load unpacked' button to select your dist folder.

This will load your extension into your browser.

Once you generated a new extension build you can reload the extension by clicking the reload button on the extensions page.

Features

- The ability to type 'ant' into the address bar, hit tab and then enter your xorname to view the file.
- File browser
- Native file view

![Omni Feature](https://github.com/SafeMedia/images/blob/main/impossible_futures/safebox/safebox-omni.png)

(You can ignore this step as I removed support for this for the moment. It will be added again soon)
In your test web application which will interface with the extension, ensure the extension ID matches the one shown on the extension page.

You can find this ID on the extensions page just underneath the name of the extension itself.

Ensure that you are serving your test application either on a website, or as localhost via an engine like 'npx serve'. This is because just right clicking and opening a html page in a browser will not work for this due to stricter cors restrictions by chrome.


You can test the features of the extension with the safebox example webpage here: [Visit Repo](https://github.com/SafeMedia/safebox-example-webpage)

(Not currently supporting - new version soon)
![SafeBox Example Webpage](https://github.com/SafeMedia/images/blob/main/impossible_futures/safebox/safebox_gif.gif)

(Not currently supporting - new version soon)
You can get the SafeBox local client here: [Visit Repo](https://github.com/SafeMedia/safebox-client)

### Contribute

Make/find an issue & create a PR - All contributions appreciated!
