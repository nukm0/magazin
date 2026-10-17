import {test} from "node:test";
import assert from "node:assert/strict";
import {catalogPreview,withPreviewProfiles,switchPreviewProfile,previewMutation} from "../lib/demo";
test("Preview roles enforce store and team permissions, revocation persists",()=>{
 let s=withPreviewProfiles(catalogPreview());
 assert.deepEqual(s.team.map(p=>p.role),["owner","buyer","deputy","seller","seller"]);
 s=switchPreviewProfile(s,"100000001");
 assert.throws(()=>previewMutation(s,{action:"category",name:"Denied",parent_id:null}),/покупателя/);
 s=previewMutation(s,{action:"theme",theme:"purple"});
 s=switchPreviewProfile(s,"100000002");
 s=previewMutation(s,{action:"category",name:"Allowed",parent_id:null});
 assert.throws(()=>previewMutation(s,{action:"deputy",id:"100000001",enabled:true}),/владелец/);
 s=switchPreviewProfile(s,"998579758");
 assert.equal(s.categories.at(-1)?.name,"Allowed");
 s=previewMutation(s,{action:"deputy",id:"100000002",enabled:false});
 s=switchPreviewProfile(s,"100000002");assert.equal(s.me?.role,"buyer");
 assert.throws(()=>previewMutation(s,{action:"category",name:"Denied",parent_id:null}));
 s=switchPreviewProfile(s,"100000001");assert.equal(s.me?.theme,"purple");
 s=switchPreviewProfile(s,"998579758");s=previewMutation(s,{action:"deputy",id:"100000001",enabled:true});
 s=switchPreviewProfile(s,"100000001");assert.equal(s.me?.role,"deputy");
});
test("Preview ownership transfer leaves exactly one owner and removes old owner privileges",()=>{
 let s=withPreviewProfiles(catalogPreview());s=previewMutation(s,{action:"transferOwner",id:"100000001"});
 assert.equal(s.me?.role,"buyer");assert.equal(s.team.filter(p=>p.role==="owner").length,1);
 assert.throws(()=>previewMutation(s,{action:"deputy",id:"100000002",enabled:false}));
 s=switchPreviewProfile(s,"100000001");assert.equal(s.me?.role,"owner");
});
