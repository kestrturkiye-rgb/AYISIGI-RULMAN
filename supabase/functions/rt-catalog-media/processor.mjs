// The caller supplies the pinned ImageMagick module, shared by Deno and Node tests.
export function sniff(bytes){
 if(bytes.length<12)throw Error('Dosya çok kısa.');
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'JPEG';
 if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return 'PNG';
 if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'WEBP';
 if(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')return 'PDF';
 throw Error('Yalnızca gerçek JPEG, PNG, WebP veya PDF dosyaları kabul edilir.');
}
export function processFile(bytes,magick){
 if(bytes.length===0||bytes.length>10*1024*1024)throw Error('Dosya en fazla 10 MB olabilir.');
 const type=sniff(bytes);
 if(type==='PDF'){
  // Preserve the technical document byte-for-byte; never render PDF in ImageMagick.
  const text=new TextDecoder('latin1').decode(bytes);
  if(!text.includes('%%EOF')||!/\/Type\s*\/Catalog\b/.test(text))throw Error('PDF yapısı geçersiz.');
  // Catalog PDFs must not run scripts or launch attachments when viewed.
  if(/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA|ObjStm|AcroForm|XFA)\b/i.test(text)||/#[0-9a-f]{2}/i.test(text))throw Error('Etkin içerik veya gizlenmiş PDF adları kabul edilmez. PDF’yi düzleştirip yeniden yükleyin.');
  return {bytes,mime_type:'application/pdf',extension:'pdf',width:null,height:null};
 }
 try{
 const {ImageMagick,MagickFormat,MagickReadSettings,MagickImageInfo}=magick;
 const settings=new MagickReadSettings({format:MagickFormat[type==='JPEG'?'Jpeg':type==='PNG'?'Png':'WebP']});
 const info=MagickImageInfo.create(bytes,settings);
 if(!info.width||!info.height||info.width>10000||info.height>10000||info.width*info.height>16000000)throw Error('Görsel en fazla 16 megapiksel ve 10.000 piksel kenarlı olabilir.');
 return ImageMagick.read(bytes,settings,image=>{
  image.autoOrient();
  const ratio=Math.min(1,1600/Math.max(image.width,image.height));
  if(ratio<1)image.resize(Math.max(1,Math.round(image.width*ratio)),Math.max(1,Math.round(image.height*ratio)));
  image.strip();image.quality=84;
  const width=image.width,height=image.height;
  return image.write(MagickFormat.WebP,data=>({bytes:new Uint8Array(data),mime_type:'image/webp',extension:'webp',width,height}));
 });
 }catch(e){if(e instanceof Error&&e.message.startsWith('Görsel en fazla'))throw e;throw Error('Görsel dosyası çözümlenemedi. Sağlam bir JPEG, PNG veya WebP dosyası yükleyin.');}
}

export async function validatePdf(bytes,PDFDocument){
 try{
  const doc=await PDFDocument.load(bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
  if(doc.getPageCount()<1||doc.getPageCount()>1000)throw Error('Page limit');
 }catch{throw Error('PDF açılamadı. Şifrelenmemiş ve geçerli bir teknik belge yükleyin (1–1000 sayfa).');}
}
