# Autonomi Chrome Extension

![Autonomi Chrome Extension Page](https://github.com/SafeMedia/images/blob/main/impossible_futures/autonomi-extension-page.png)


Currently while the new local client is in development, the extension is using anttp native.

To install it you must go here and download anttp: https://github.com/traktion/AntTP/releases/tag/v0.6.2

Then run the file to start anttp in the background. You don't need to do any proxy stuff.

Then be sure to install the npm packages for the extension development testing:


```bash
yarn install
```
or
```bash
npm install
```

To build the extension for testing, run:

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

If you want to try out some files:

image: 91d16e58e9164bccd29a8fd8d25218a61d8253b51c26119791b2633ff4f6b309/start-a-node.png

video: 91d16e58e9164bccd29a8fd8d25218a61d8253b51c26119791b2633ff4f6b309/to-autonomi.mp4

pdf: 7c75c7d71a9ae9d6016901b849672bf908358e704111f68cac681d003446f603

audio: a0f6fa2b08e868060fe6e57018e3f73294821feaf3fdcf9cd636ac3d11e7e2ac/BegBlag.mp3


(You can ignore this section as I removed support for this for the moment. It will be added again soon)

In your test web application which will interface with the extension, ensure the extension ID matches the one shown on the extension page.

You can find this ID on the extensions page just underneath the name of the extension itself.

Ensure that you are serving your test application either on a website, or as localhost via an engine like 'npx serve'. This is because just right clicking and opening a html page in a browser will not work for this due to stricter cors restrictions by chrome.




### Contribute

Make/find an issue & create a PR - All contributions appreciated!
