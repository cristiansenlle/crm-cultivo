const fs = require('fs');
const p = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let h = fs.readFileSync(p, 'utf8');

const t1 = '<div style="display:flex; gap: 10px;">\\r\\n<div style="flex:2;">';
const t2 = '<div style="display:flex; gap: 10px;">\\n<div style="flex:2;">';
const t3 = '<div style="display:flex; gap: 10px;">\\r\\n                            <div style="flex:2;">';
const t4 = '<div style="display:flex; gap: 10px;">\\n                            <div style="flex:2;">';
const t5 = '<div style="flex:2;">';

let replaced = false;

if (h.includes(t1)) { h = h.replace(t1, '<div style="display:flex; gap: 10px; margin-top:5px;">\\r\\n                            <div style="flex:1;">'); replaced = true; }
else if (h.includes(t2)) { h = h.replace(t2, '<div style="display:flex; gap: 10px; margin-top:5px;">\\n                            <div style="flex:1;">'); replaced = true; }
else if (h.includes(t3)) { h = h.replace(t3, '<div style="display:flex; gap: 10px; margin-top:5px;">\\r\\n                            <div style="flex:1;">'); replaced = true; }
else if (h.includes(t4)) { h = h.replace(t4, '<div style="display:flex; gap: 10px; margin-top:5px;">\\n                            <div style="flex:1;">'); replaced = true; }
else if (h.includes(t5)) { 
    h = h.replace(t5, '<div style="flex:1;">'); 
    h = h.replace('<div style="display:flex; gap: 10px;">\\n<div style="flex:1;">', '<div style="display:flex; gap: 10px; margin-top:5px;">\\n                            <div style="flex:1;">');
    replaced = true; 
}

if (replaced) {
    fs.writeFileSync(p, h, 'utf8');
    console.log("PATCHED AND SAVED");
} else {
    let idx = h.indexOf('flex:2');
    console.log("Not found any standard pattern. flex:2 index:", idx);
    if(idx > -1) {
        console.log(h.substring(idx - 50, idx + 50));
    }
}
