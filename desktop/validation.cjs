exports.validImage = image => !!image && Number.isInteger(image.width) && Number.isInteger(image.height) && image.width>0 && image.height>0 && image.width<=1600 && image.height<=1200 && ArrayBuffer.isView(image.data) && image.data.BYTES_PER_ELEMENT===1 && image.data.length===image.width*image.height*4;
exports.validLevel = value => typeof value==='number' && Number.isFinite(value) && value>=0 && value<=1;
exports.trustedUrl = value => {try{const url=new URL(value);return url.protocol==='app:' && url.hostname==='dotpond';}catch{return false;}};
