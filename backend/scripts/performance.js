const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'performance-fixture-secret-not-for-deployment';
process.env.TEST_RATE_LIMIT = '100000';
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const db = require('../src/db');
const samples = 200;
const concurrency = 10;
const results = [];
async function main() {
  const password = 'Performance-Fixture26!';
  db.prepare('INSERT INTO user (username,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Performance fixture', 'performance@example.test', await bcrypt.hash(password, 12), 'customer');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port + '/api';
    const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email:'performance@example.test',password}) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const request = async () => {
      const start = performance.now();
      const response = await fetch(base + '/location/update', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({latitude:-33.8673,longitude:151.2086}) });
      const data = await response.json();
      assert.equal(response.status, 200);
      assert.ok(data.recommendations.length > 0);
      return performance.now() - start;
    };
    for (const restaurantCount of [6, 1006]) {
      if (restaurantCount > 6) {
        const insert = db.prepare('INSERT INTO restaurant (name,cuisine_type,latitude,longitude,address,price_range,vegetarian_friendly,vegan_friendly) VALUES (?,?,?,?,?,?,?,?)');
        db.exec('BEGIN');
        for (let i=0;i<1000;i++) insert.run('Synthetic venue '+i,'Indian',-33.8673 + (i%20)*0.001,151.2086 + Math.floor(i/20)*0.0003,'Synthetic benchmark fixture','$$',1,1);
        db.exec('COMMIT');
      }
      for (let i=0;i<10;i++) await request();
      let next = 0;
      const durations = [], errors = [];
      const started = performance.now();
      await Promise.all(Array.from({length:concurrency}, async () => {
        while (next++ < samples) {
          try { durations.push(await request()); } catch (error) { errors.push(error.message); }
        }
      }));
      const elapsed = performance.now() - started;
      durations.sort((a,b)=>a-b);
      const percentile = p => Number((durations[Math.ceil(durations.length*p)-1] || 0).toFixed(2));
      results.push({restaurantCount,samples,concurrency,warmup:10,successful:durations.length,failures:errors.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),maxMs:percentile(1),elapsedMs:Number(elapsed.toFixed(2)),requestsPerSecond:Number((samples*1000/elapsed).toFixed(2)),errors});
    }
  } finally { await new Promise(resolve=>server.close(resolve)); db.close(); }
  const evidence = {capturedAt:new Date().toISOString(),node:process.version,platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGiB:Number((os.totalmem()/2**30).toFixed(1)),method:'Local HTTP; real JWT cookie; isolated in-memory SQLite; one process; rate limiter raised for benchmark only. Request latency includes JSON body consumption. Not internet/production/load-capacity evidence.',results};
  const destination = path.resolve(__dirname,'../test-results/performance.json');
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(results.some(r=>r.failures || r.p95Ms>=3000)) process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
