const url = "https://github.com/pybricks/pybricks-micropython/releases/download/v3.2.3/pybricks-primehub-v3.2.3.zip";
const bin = new Uint8Array(await (await fetch(url)).arrayBuffer());
await Deno.writeFile("firmware.zip", bin);
