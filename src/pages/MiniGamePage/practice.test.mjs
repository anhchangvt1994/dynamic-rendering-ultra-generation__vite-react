import test from 'node:test'
import assert from 'node:assert/strict'
import { createPractice } from './practice.mjs'

const seeded=(seed)=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}

test('jigsaw practice deals pieces with the right starting turns, not an answer quiz',()=>{
  for(let difficulty=1;difficulty<=3;difficulty++){
    const game=createPractice({game:'silhouette-atelier',difficulty,random:seeded(difficulty)})
    const {view}=game
    assert.equal(view.kind,'silhouette-atelier')
    assert.deepEqual([view.cols,view.rows],[[2,3],[3,3],[3,4]][difficulty-1])
    assert.equal(view.rot.length,view.cols*view.rows)
    assert.ok(view.rot.every((r)=>r>=0&&r<4))
    if(difficulty===1)assert.ok(view.rot.every((r)=>r===0))
    if(difficulty===3)assert.ok(view.rot.every((r)=>r!==0))
    assert.equal(view.elapsedMs,0)
    assert.equal(view.durationMs,300000)
    assert.equal('answer' in game,false)
    assert.equal('practiceSpeciesId' in view,false)
    assert.ok(game.deadline>Date.now())
  }
})

test('lucky spin practice gives three spins and rewards on the last', async () => {
  const p = createPractice({ game: 'lucky-spin', difficulty: 1, random: () => 0 })
  assert.equal(p.view.kind, 'lucky-spin')
  const a = await p.spin()
  assert.equal(a.spin.grid.length, 15)
  assert.equal(a.done, false)
  assert.equal('outcome' in a, false)
  await p.spin()
  const c = await p.spin()
  assert.equal(c.done, true)
  assert.equal(c.spins, 3)
  assert.ok(['common', 'uncommon', 'rare'].includes(c.outcome))
  await assert.rejects(() => p.spin(), { code: 'bad_move' })
})
