import {test} from "node:test";import assert from "node:assert/strict";
import {actionSchema} from "../lib/validation";import {categoryMeasurements,validateAttributes,validateMeasurements} from "../lib/measurements";
import {blankPreview,previewMutation} from "../lib/demo";import {LocalStore} from "../lib/local-store";
test("Clothing measurements inherit units and override in child categories",()=>{
 const parent=crypto.randomUUID(),child=crypto.randomUUID(),categories=[{id:parent,name:"Одежда",parent_id:null,measurements:[{key:"size" as const,unit:""},{key:"length" as const,unit:"см"}]},{id:child,name:"Брюки",parent_id:parent,measurements:[{key:"length" as const,unit:"м"}]}];
 assert.deepEqual(categoryMeasurements(categories,child),[{key:"size",unit:""},{key:"length",unit:"м"}]);assert.deepEqual(validateAttributes(categories,child,{size:"M",length:"1,05"}),{size:"M",length:"1,05"});assert.throws(()=>validateAttributes(categories,child,{weight:"100"}));assert.throws(()=>validateAttributes(categories,child,{length:"-1"}));assert.throws(()=>validateMeasurements([{key:"size",unit:"кг"}]));
 assert.throws(()=>actionSchema.parse({action:"category",name:"Test",parent_id:null,measurements:[{key:"custom",unit:""}]}));
});
test("Measurement definitions and product values persist in local store",()=>{
 const db=new LocalStore(":memory:"),owner="998579758";try{db.snapshot(owner);db.mutate(owner,{action:"category",name:"Брюки",parent_id:null,measurements:[{key:"size",unit:""}]});const c=db.snapshot(owner).categories[0];db.mutate(owner,{action:"product",title:"Джинсы",description:"",price:10000,stock:1,category_id:c.id,image_url:"",active:true,attributes:{size:"L"}});assert.equal(db.snapshot(owner).products[0].attributes?.size,"L");assert.equal(db.snapshot(owner).categories[0].measurements?.[0].key,"size");}finally{db.close();}
});
test("Preview product characteristics survive saving and invalid extra fields fail",()=>{
 let s=previewMutation(blankPreview(),{action:"category",name:"Одежда",parent_id:null,measurements:[{key:"color",unit:""}]});const action={action:"product",title:"Джинсы",description:"",price:10000,stock:1,category_id:s.categories[0].id,image_url:"",active:true,attributes:{color:"Синий"}};s=previewMutation(s,action);assert.equal(s.products[0].attributes?.color,"Синий");assert.throws(()=>previewMutation(s,{...action,attributes:{material:"Хлопок"}}));
});
