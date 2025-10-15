import * as fs from 'fs';
import * as path from 'path';
import avro from 'avsc';

export function loadType(name: string) {
  const p = path.join(__dirname, '..', 'schemas', `${name}.avsc`);
  const raw = fs.readFileSync(p, 'utf8');
  const schema = JSON.parse(raw);
  return avro.Type.forSchema(schema);
}
