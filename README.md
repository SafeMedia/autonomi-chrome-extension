# Autonomi Chrome Extension

![Autonomi Chrome Extension Page](https://github.com/SafeMedia/images/blob/main/impossible_futures/autonomi-extension-page.png)

This extension will be published on the store once development is complete. Until then you can use it in beta by following these instructions.

To build your extension for testing, run:

```bash
yarn run build
```

This will generate a dist folder in your project folder.

You can now go to your extensions page in your chromium browser. (chrome, brave etc)

From here you need to enable developer mode. Then you can click the 'load unpacked' button to select your dist folder.

This will load your extension into your browser.

In your test web application that will interface with the extension, ensure the extension ID matches the one shown on the extension page.

You can find this ID on the extensions page just underneath the name of the extension itself.

Once you generated a new extension build you can reload the extension by clicking the reload button on the extensions page.

Ensure that you are serving your test application either on a website, or as localhost via an engine like 'npx serve'. This is because just right clicking and opening a html page in a browser will not work for this due to stricter cors restrictions by chrome.

Currently download and uploading is working via the extension. Another feature that is currently in development is the ability to type 'ant' into the address bar, hit tab and then enter your xorname to download and view the file.

![Omni Feature](https://github.com/SafeMedia/images/blob/main/impossible_futures/safebox/safebox-omni.png)
