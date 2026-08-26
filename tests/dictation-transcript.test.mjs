import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assistant-v2.js', import.meta.url), 'utf8');
const joinMatch = source.match(/const joinDictationParts=parts=>[^;]+;/);
const updateStart = source.indexOf('const updateDictationSegments=event=>{');
const updateEnd = source.indexOf('\n    };', updateStart) + '\n    };'.length;

if (!joinMatch || updateStart < 0 || updateEnd < updateStart) {
  throw new Error('Could not load the production dictation buffer');
}

const createBuffer = new Function(`
  let dictationSessionFinal='',dictationInterim='',dictationSegments=[];
  ${joinMatch[0]}
  ${source.slice(updateStart, updateEnd)}
  return {
    update: updateDictationSegments,
    state: () => ({ final: dictationSessionFinal, interim: dictationInterim }),
    preserveRestart: committed => joinDictationParts([committed,dictationSessionFinal,dictationInterim])
  };
`);

const result = (text, isFinal) => Object.assign([{ transcript: text }], { isFinal });
const event = (results, resultIndex = 0) => ({ results, resultIndex });
const buffer = createBuffer();

const check = (label, actual, expected) => {
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) {
    console.log(`      expected: ${expected}`);
    console.log(`      received: ${actual}`);
    process.exitCode = 1;
  }
};

console.log('=== finalized chunks keep their spaces and content ===');
buffer.update(event([result('Hello', true)]));
buffer.update(event([result('Hello', true), result('How are you doing', false)], 1));
check('separate browser chunks do not become HelloHow', buffer.state().final, 'Hello');
check('the current phrase remains tracked as interim text', buffer.state().interim, 'How are you doing');

buffer.update(event([
  result('Hello', true),
  result('How are you doing', true),
  result("Um I'm just thinking", false)
], 1));
check('a finalized second phrase is spaced and retained', buffer.state().final, 'Hello How are you doing');

buffer.update(event([
  result('Hello', true),
  result('How are you doing', true),
  result("Um I'm just thinking what's going on", false)
], 2));
check('only the active interim phrase is revised', buffer.state().final, 'Hello How are you doing');
check('the revised interim phrase remains available until finalization', buffer.state().interim, "Um I'm just thinking what's going on");

console.log('\n=== recognition restarts do not drop visible speech ===');
check(
  'the interim tail is preserved when the browser restarts recognition',
  buffer.preserveRestart('Earlier words'),
  "Earlier words Hello How are you doing Um I'm just thinking what's going on"
);
