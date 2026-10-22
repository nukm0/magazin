const formats=["image/png","image/jpeg","image/webp"];
const targetBytes=300000;
function read(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("Не удалось прочитать фото"));r.readAsDataURL(blob)})}
export async function prepareImage(file:File):Promise<string>{
 if(!formats.includes(file.type))throw new Error("Выберите фото PNG, JPEG или WebP");
 const url=URL.createObjectURL(file),image=new Image();try{
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Не удалось открыть фото. Выберите другое изображение."));image.src=url});
  if(file.size<=targetBytes&&Math.max(image.naturalWidth,image.naturalHeight)<=2560)return read(file);
  const canvas=document.createElement("canvas"),context=canvas.getContext("2d");if(!context)throw new Error("Не удалось подготовить фото");let scale=Math.min(1,2560/Math.max(image.naturalWidth,image.naturalHeight)),quality=.9;
  for(let i=0;i<20;i++){
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Не удалось подготовить фото")),"image/webp",quality));
   if(blob.size<=targetBytes)return read(blob);
   if(quality>.6)quality-=.12;else scale*=.8;
  }
  throw new Error("Не удалось подготовить фото. Попробуйте другое изображение.");
 }finally{URL.revokeObjectURL(url)}
}
