const text = `{\n  "stage": "cosecha",\n  "weight_wet": {peso_gramos}\n}`;
const regex = /{([^}]+)}/g;
let match;
console.log('Testing text:', text);
while ((match = regex.exec(text)) !== null) {
    console.log('Match found:', match[1]);
}
