# Autonomi Chrome Extension

<img width="1503" height="799" alt="main-3" src="https://github.com/user-attachments/assets/8e53023f-6be9-4a06-91ec-9cb8eb9e2a45" />


You can read the documentation here: [https://safemedia.com](https://safemedia.com)


## Contents:

- [Getting Started](#getting-started)
- [Endpoints Mode](#endpoints-mode)
- [Local Mode](#local-mode)
- [Local Client](#local-client)
- [Search Bar](#search-bar)
- [Omnibox](#omnibox)
- [Websockets](#websockets)
- [Developers](#developers)
- [Contribute](#contribute)

## Getting Started:

You can follow along with the instructions below to install the extension on your browser. We currently support chromium based browsers like Chrome & Brave.

Until the extension is deployed to the Chrome extenson store, you can install it via developer mode. This will be explained in-depth below.

You can download the latest release here:  [Releases](https://github.com/SafeMedia/autonomi-chrome-extension/releases)

Once downloaded, unzip it. Inside the folder should be a folder called 'extension'. 

You can now go to the extensions page in your chromium browser. You can reach this at either chrome://extensions or brave://extensions

From here you need to enable developer mode:

<img width="700" height="74" alt="dev-mode" src="https://github.com/user-attachments/assets/85607d4e-f1c1-454a-9a20-dc2e86dcf682" />

Then you can click the 'load unpacked' button to select extension folder:

<img width="700" height="74" alt="dev-mode-2" src="https://github.com/user-attachments/assets/8ca5f913-f94a-47bd-9a1e-b4accb02f37d" />

This will load your extension into your browser.

You should now see the following in your extensions page:

<img width="418" height="226" alt="extension-info" src="https://github.com/user-attachments/assets/235eabb2-153b-4f1e-8861-8571948903ac" />

You can now click the Autonomi extension at the top right of your browser to interact with the network. You can pin the extension for easy access.

<img width="370" height="263" alt="pin" src="https://github.com/user-attachments/assets/2f95d1ec-705b-42bd-8417-572002ae3089" />

Once pinned it will stay in place:

<img width="213" height="95" alt="pin-result" src="https://github.com/user-attachments/assets/bb62d9da-cbae-41ed-b827-beaf851211dc" />

Now that the extension is installed, you can open it by clicking on the Autonomi extension in the top right of the brwoser page:

<img width="280" height="368" alt="extension-default" src="https://github.com/user-attachments/assets/dad3f122-de6a-464f-b01f-d023eea655c9" />

If you want to try out the network, here are some Autonomi URLs. You can paste them into the extension search.

image: 
```bash
91d16e58e9164bccd29a8fd8d25218a61d8253b51c26119791b2633ff4f6b309/start-a-node.png
```

video: 
```bash
91d16e58e9164bccd29a8fd8d25218a61d8253b51c26119791b2633ff4f6b309/to-autonomi.mp4
```

pdf:
```bash
7c75c7d71a9ae9d6016901b849672bf908358e704111f68cac681d003446f603
```

audio:
```bash
0f6fa2b08e868060fe6e57018e3f73294821feaf3fdcf9cd636ac3d11e7e2ac/BegBlag.mp3
```


## Endpoints Mode

### What is Endpoints mode

Endpoints mode is a mode that allows the extension to browse & download files from the Autonomi network by using endpoint servers. These endpoints servers are generally ran by other community members. The main benefit to Endponts mode is that you don't need to install the local client. However it has some downsides, as using the local client means you have more privacy.

The extension will have some Endpoint servers already populated by the Extension. This will enable you to start browsing the Autonomi network instantly.

### How add more Endpoint servers

You can add a new Endpoint server by entering the base domain of a valid Endpoint server.

The extension will use the first Endpoint server that sends back a valid response, indicating that it is available.

You can drag/drop the different Endpoint servers that you have added to re-order them in order of preference.

<img width="402" height="527" alt="endpoints" src="https://github.com/user-attachments/assets/3a419304-d34a-4651-8f9d-800bdde93ad0" />

### Browsing

DWeb browsing is not yet supported on Endpoints mode, so AntTP browsing is the only supported option.

<img width="380" height="506" alt="endpoints-browse" src="https://github.com/user-attachments/assets/c4edb4b0-fe71-48e1-b895-75e10c53e180" />


Once you enter a valid Autonomi url and hit browse you will see:

<img width="861" height="756" alt="endpoints-browse-result" src="https://github.com/user-attachments/assets/c3c2e940-ba8a-4e7c-8873-28e6f87f79fd" />

### How to change modes

You can change the mode by going to the settings page on the Extension. There you will see which mode is currently enabled, either Endpoints Servers or Local Client. You can use the dropdown to change the mode.


## Local Mode

### What is Local mode

Local mode is a mode that requires a local client running on your machine. This local client will connect to the Autonomi network and relay the data to your Extension. You can gain more privacy by using local mode.

<img width="390" height="523" alt="local" src="https://github.com/user-attachments/assets/0b3d9ccf-a358-4f70-888f-bf14c0d06de5" />

### Check connection

Once you have your local client running on your machine you can ensure the connection is working by clicking the 'Test local connection' button.

You can ensure the port is correct by checking on your local client and configuring both websocket ports to be the same.

### DWeb

Currently browsing via DWeb is only supported on local mode. This method allows you to enter a valid dweb url, or a dweb domain. Here is an example showing how you can open the dweb wiki:

<img width="399" height="520" alt="local-dweb" src="https://github.com/user-attachments/assets/55a8f5ac-b868-4f5d-b67e-a3619def6dd3" />

Which will then open this page:

<img width="1106" height="660" alt="local-dweb-result" src="https://github.com/user-attachments/assets/fd796c36-c74c-43d9-9734-97cd93a49012" />

### How to change modes

You can change the mode by going to the settings on the Extension. There you will see which mode is currently enabled, either Endpoints Servers or Local Client. You can use the dropdown to change the mode.

## Local Client

### What is the local client

The local client, is an application that runs on your machine that will relay data from the Autonomi network to your extension. The local client can be installed on your machine. Windows, MacOS & Linux are supported supported. You can download the latest release from here:

[Releases](https://github.com/SafeMedia/safebox-client/releases)

Once installed, you can start the application. The icon on the taskbar should look like:

<img width="43" height="49" alt="icon" src="https://github.com/user-attachments/assets/21c4fad7-8e1d-4841-b953-5d43b23d90f8" />

### Local client interface

<img width="1223" height="673" alt="hhf" src="https://github.com/user-attachments/assets/20fb14c8-fd89-4d14-a1fa-1d17195b6c63" />

### Check connection

Once you have your local client running on your machine you can ensure the connection is working by clicking the 'Test local connection' button.

You can ensure the port is correct by checking on your local client and configuring both websocket ports to be the same.

<img width="390" height="523" alt="local" src="https://github.com/user-attachments/assets/49ea8a38-d4b7-4840-85f7-34cda29b9512" />

### Ports

You can change the Ant, AntTP and DWeb ports on the local client. Once changed, the extension will learn of these changes automatically.

## Search Bar

### What is the search bar

The search bar is at the top of each page that is loaded from the Autonomi network. You can use it to browse valid Autonomi urls.

<img width="1100" height="49" alt="search" src="https://github.com/user-attachments/assets/e9cd5e95-c8a3-4a84-b0f3-0c98b7a46698" />

### Download button

You can use the download button on the search bar to download the current file you are on. If multiple files are loaded on the page, the page will just be downloaded as a html file, otherwise it will download the actual file.

### Search & modes

If you are on local mode, the search bar will request data via your local client. Should your local client not be running it will instead inform you that 'This site can't be reached'.

If you are on Endpoint mode, the search bar will request data via the first successful Endpoint server.

## Omnibox

Omnibox is a feature that allows you to type 'ant', hit tab, then enter your Autonomi url.

### How to use the Omnibox

You can use the Omnibox by going to the address bar in your browser where the extension is installed:

<img width="1337" height="43" alt="omnibox-1" src="https://github.com/user-attachments/assets/408415fe-400c-47c5-9726-013019c1b15a" />

Then you can type 'ant'

<img width="1334" height="38" alt="omnibox-2" src="https://github.com/user-attachments/assets/f01c7585-98e3-4ba2-b370-665595bda492" />

Then press the tab key. You should now see the Omnibox search:

<img width="1336" height="43" alt="omnibox-3" src="https://github.com/user-attachments/assets/8e7db60e-ce7f-4bc8-9840-2031ecf68b9e" />

You should now enter the Autonomi url that you wish to browse to:

<img width="1337" height="41" alt="omnibox-4" src="https://github.com/user-attachments/assets/10bf8788-5271-4c35-a32a-219e1f06755a" />

If you are on local mode you would see:

<img width="1493" height="757" alt="omnibox-5" src="https://github.com/user-attachments/assets/4e305f03-24ae-4f61-a041-eec6ef95671f" />

Alternatively if you are on endpoints mode you would see:

<img width="1494" height="759" alt="omnibox-6" src="https://github.com/user-attachments/assets/0b1d05e6-058e-426c-9e67-70b20b5a833f" />

## Websockets

### What are Websockets

Websockets are a communication technology. It allows a continous stream of data to flow between applications.

### Websockets in the local client

The local client has websockets built in. It allow the communication between webpages, the extension and the local client.

Having websockets allow normal clearnet webpages to request content from the Autonomi network. This allows certain features like adding Autonomi functionality to forms & buttons. It also allows the ability to replace Autonomi shortcodes with the actual content.

Uploads via this method are planned to be re-enabled soon.

## Developers

If you want to contribute to the development of the extension, you can check to see if there are any issues at: [Issues](https://github.com/SafeMedia/autonomi-chrome-extension/issues)

You can make a PR at: [Issues](https://github.com/SafeMedia/autonomi-chrome-extension/pulls)


First you should download the extension source code. You can either clone it, or by clicking the green button above and 'download zip'

Then be sure to install the npm packages for the extension development environment (you need npm/yarn installed on your pc):

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

If you are building a web application that uses the websockets interface of the extension, you should ensure the following:

In your test web application which will interface with the extension, ensure the extension ID matches the one shown on the extension page.

You can find this ID on the extensions page just underneath the name of the extension itself.

Ensure that you are serving your test application either on a website, or as localhost via an engine like 'npx serve'. This is because just right clicking and opening a html page in a browser will not work for this due to stricter cors restrictions by chrome.

## Contribute

Make/find an issue & create a PR - All contributions appreciated!
