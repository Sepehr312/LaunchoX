export const staticPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwUMMAYAj4IP8cvlVgcAAAAASUVORK5CYII=",
  "base64",
);

export function pngChunk(type: string, data: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}

export function animatedPng(frames: number, corrupt = false): Buffer {
  const animation = Buffer.alloc(8);
  animation.writeUInt32BE(frames);
  const control = (sequence: number) => {
    const data = Buffer.alloc(26);
    data.writeUInt32BE(sequence);
    data.writeUInt32BE(2, 4);
    data.writeUInt32BE(2, 8);
    data.writeUInt16BE(1, 20);
    data.writeUInt16BE(50, 22);
    return pngChunk("fcTL", data);
  };
  const chunks = [
    staticPng.subarray(0, 33),
    pngChunk("acTL", animation),
    control(0),
  ];
  let pixels = Buffer.alloc(0);
  for (let offset = 33; offset < staticPng.length;) {
    const length = staticPng.readUInt32BE(offset);
    if (staticPng.toString("ascii", offset + 4, offset + 8) === "IDAT")
      pixels = staticPng.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
  }
  chunks.push(pngChunk("IDAT", pixels));
  for (let frame = 1; frame < frames; frame++) {
    const sequence = Buffer.alloc(4);
    sequence.writeUInt32BE(frame * 2);
    chunks.push(
      control(frame * 2 - 1),
      pngChunk(
        "fdAT",
        Buffer.concat([sequence, corrupt ? Buffer.from("broken") : pixels]),
      ),
    );
  }
  return Buffer.concat([...chunks, pngChunk("IEND", Buffer.alloc(0))]);
}
