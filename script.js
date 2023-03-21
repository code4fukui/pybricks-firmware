import { WebDFU } from "https://code4fukui.github.io/webdfu/WebDFU.js";
import { unzip } from "https://taisukef.github.io/zlib.js/es/unzip.js";

const url = "./firmware.zip";
const zip = new Uint8Array(await (await fetch(url)).arrayBuffer());
const zips = unzip(zip);
console.log(zip, zips)
const filenames = zips.getFilenames();
console.log(filenames);
const meta = JSON.parse(new TextDecoder().decode(zips.decompress("firmware.metadata.json")));
console.log(meta);
divinfo.innerHTML = JSON.stringify(meta, null, 2).replace(/ /g, "&nbsp;").split("\n").join("<br>");
const firmwareFile = zips.decompress("firmware-base.bin")

const showProgress = (span, s, n, len) => {
  span.textContent = `${s}: ${(n / len * 100).toFixed(1)}% (${n} / ${len}byte)`;
};

async function connect() {
  // Load the device by WebUSB
  const selectedDevice = await navigator.usb.requestDevice({ filters: [] });

  // Create and init the WebDFU instance
  const webdfu = new WebDFU(
    selectedDevice,
    { forceInterfacesName: true },
    {
      // NB: info and progress are never called in dfu v0.1.5
      info: console.debug,
      warning: console.warn,
      progress: console.debug,
    },
  );
  await webdfu.init();

  const ifaceIndex = webdfu.interfaces.findIndex(i => i.alternate.alternateSetting === 0);
  if (webdfu.interfaces.length == 0 || ifaceIndex  == -1) {
    throw new Error("The selected device does not have any USB DFU interfaces.");
  }

  // Connect to first device interface
  console.log("ifaceIndex", ifaceIndex);
  await webdfu.connect(ifaceIndex);

  console.log({
    Version: webdfu.properties.DFUVersion.toString(16),
    CanUpload: webdfu.properties.CanUpload,
    CanDownload: webdfu.properties.CanDownload,
    TransferSize: webdfu.properties.TransferSize,
    DetachTimeOut: webdfu.properties.DetachTimeOut,
  });
  /*
  // Read firmware from device
  try {
    const firmwareFile = await webdfu.read();

    console.log("Read: ", firmwareFile);
  } catch (error) {
    console.error(error);
  }
  */
  
  // Write firmware in device
  try {
    // set hub name
    const name = new TextEncoder().encode(inname.value);
    if (name.length > 0) {
      for (let i = 0; i < meta["hub-name-size"]; i++) {
        firmwareFile[i + meta["hub-name-offset"]] = name[i] || 0;
      }
    }

    //const url = "./firmware-base.bin";
    //const firmwareFile = await (await fetch(url)).arrayBuffer();
    console.log(webdfu.dfuseStartAddress);
    const dfuFirmwareStartAddress = 0x08008000;
    webdfu.dfuseStartAddress = dfuFirmwareStartAddress;
    const p = webdfu.write(webdfu.properties.TransferSize, firmwareFile, true);
    p.events.on('erase/process', (bytesSent, expectedSize) => {
      console.log("erase", { bytesSent, expectedSize });
      showProgress(spanerace, "erase", bytesSent, expectedSize);
    });
    p.events.on('write/process', (bytesSent, expectedSize) => {
      console.log("write", { bytesSent, expectedSize });
      showProgress(spanwrite, "write", bytesSent, expectedSize);
    });
    await (async () => new Promise(resolve => {
      p.events.on("end", resolve);
    }))();
    console.log("Written!");
    await webdfu.close();
  } catch (error) {
    console.error(error);
  }
};

btnwrite.onclick = connect;
