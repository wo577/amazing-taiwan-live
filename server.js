const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const QRCode=require('qrcode');
const crypto=require('crypto');
const app=express();const server=http.createServer(app);const io=new Server(server);
app.use(express.static('public'));
const SETS={
 places:{title:'Places',intro:'Scan the travel blog. Find the place.',questions:[
 {text:'On Saturday, Amy visited a busy night market. She tasted sweet snacks and bought a gift for her brother.',prompt:'Where did Amy buy a gift?',choices:['At a temple','At a night market','At a beach','At a river'],answer:1,evidence:'She tasted sweet snacks and bought a gift.'},
 {text:'The next morning, Ben climbed a mountain. At the top, he could see green forests and clouds.',prompt:'Where did Ben see the clouds?',choices:['On a mountain','In a city','At a market','At a temple'],answer:0,evidence:'At the top, he could see green forests and clouds.'},
 {text:'Lily spent the afternoon at the beach. She played in the sand, but the water was too cold for swimming.',prompt:'Where did Lily play?',choices:['At a river','At a night market','At a beach','In a city'],answer:2,evidence:'She played in the sand.'},
 {text:'In Taipei, Leo saw tall buildings, busy roads and many shops. He took a photo of the city lights.',prompt:'Where did Leo see busy roads?',choices:['On a mountain','At a temple','At a beach','In the city'],answer:3,evidence:'He saw tall buildings, busy roads and many shops.'},
 {text:'Before lunch, Nina visited an old temple. She admired its colourful roof and listened to a quiet bell.',prompt:'Where did Nina hear a bell?',choices:['At a temple','At a river','At a market','At a beach'],answer:0,evidence:'She admired its colourful roof and listened to a quiet bell.'},
 {text:'After school, Kevin walked beside a river. He watched the water flow under a small bridge.',prompt:'Where did Kevin see the bridge?',choices:['In the city','Beside a river','At a market','On a mountain'],answer:1,evidence:'He watched the water flow under a small bridge.'}
 ]},
 activities:{title:'Activities',intro:'Scan for what the traveller did.',questions:[
 {text:'At the night market, Mei looked at the food stalls. She tried a bowl of noodles, but she did not buy clothes.',prompt:'What did Mei do?',choices:['Bought clothes','Tried noodles','Rode a bike','Climbed a mountain'],answer:1,evidence:'She tried a bowl of noodles.'},
 {text:'On Sunday, Jason went to the beach with his cousins. They built a sandcastle and took photos. Nobody went swimming.',prompt:'What did Jason and his cousins do?',choices:['Went swimming','Bought snacks','Built a sandcastle','Played basketball'],answer:2,evidence:'They built a sandcastle and took photos.'},
 {text:'Emma visited a temple in the morning. She took off her shoes before entering and looked at the beautiful paintings.',prompt:'What did Emma do before entering?',choices:['Took off her shoes','Bought a ticket','Ate breakfast','Rode a bike'],answer:0,evidence:'She took off her shoes before entering.'},
 {text:'Tom and his dad followed a path up a mountain. They stopped to drink water and enjoy the view.',prompt:'What activity did Tom do?',choices:['Shopping','Surfing','Cycling','Hiking'],answer:3,evidence:'They followed a path up a mountain.'},
 {text:'After lunch, Ruby rented a bicycle near the river. She rode slowly along the path and waved at her friends.',prompt:'How did Ruby travel beside the river?',choices:['By train','By bicycle','By bus','By boat'],answer:1,evidence:'She rented a bicycle ... She rode slowly along the path.'},
 {text:'In Taipei, Alex walked around the city. He visited a bookshop and bought a postcard for his teacher.',prompt:'What did Alex buy?',choices:['A postcard','A bicycle','A hat','A camera'],answer:0,evidence:'He ... bought a postcard for his teacher.'}
 ]},
 blog:{title:'Blog Challenge',intro:'Read carefully. Think before you tap.',questions:[
 {text:'Friday: I wanted to swim, but it rained all afternoon. Instead, I stayed inside and wrote my travel blog.',prompt:'Why did the writer stay inside?',choices:['It was too hot','It was raining','The beach was closed','The writer was tired'],answer:1,evidence:'It rained all afternoon. Instead, I stayed inside.'},
 {text:'Saturday: We planned to climb a mountain. My sister forgot her shoes, so we visited a night market instead.',prompt:'What changed their plan?',choices:['They missed the bus','The market was closed','Someone forgot shoes','It started snowing'],answer:2,evidence:'My sister forgot her shoes, so we visited a night market instead.'},
 {text:'I loved the temple because it was peaceful. The night market was exciting, but it was too crowded for me.',prompt:'Which place did the writer probably prefer?',choices:['The temple','The night market','The beach','The city station'],answer:0,evidence:'I loved the temple because it was peaceful.'},
 {text:'First, we took photos in the city. Next, we ate snacks at a market. Finally, we walked beside the river.',prompt:'What did they do LAST?',choices:['Took photos','Ate snacks','Visited a temple','Walked beside the river'],answer:3,evidence:'Finally, we walked beside the river.'},
 {text:'My friend said Yushan was easy to climb. After four hours of hiking, she was tired and needed a long rest.',prompt:'Which word BEST describes the hike?',choices:['Easy','Difficult','Boring','Short'],answer:1,evidence:'After four hours of hiking, she was tired and needed a long rest.'},
 {text:'We reached the beach at 5 p.m. The sun was going down. We did not swim, but we watched the beautiful sky.',prompt:'What did the travellers enjoy?',choices:['The sunrise','A boat ride','The sunset','A swimming race'],answer:2,evidence:'The sun was going down ... we watched the beautiful sky.'}
 ]}
};
const rooms=new Map();
function code(){let c;do{c=String(Math.floor(100000+Math.random()*900000))}while(rooms.has(c));return c}
function ack(cb,value){if(typeof cb==='function')cb(value)}
function stop(r){if(r.timer){clearInterval(r.timer);r.timer=null}}
function players(r){return [...r.players.values()].map(p=>({name:p.name,score:p.score,correct:p.correct,connected:p.connected}))}
function state(r){const q=SETS[r.set].questions[r.index];return {code:r.code,phase:r.phase,set:r.set,setTitle:SETS[r.set].title,round:r.round,index:r.index,total:SETS[r.set].questions.length,remaining:r.remaining,answered:r.answered.size,players:players(r),passage:q?.text||'',prompt:q?.prompt||'',choices:q?.choices||[],answer:r.phase==='reveal'?q.answer:null,evidence:r.phase==='reveal'?q.evidence:null}}
function emit(r){io.to(r.code).emit('state',state(r))}
function reveal(r){stop(r);r.phase='reveal';emit(r)}
function tick(r){stop(r);r.timer=setInterval(()=>{r.remaining--;if(r.remaining<=0){r.remaining=0;reveal(r)}else emit(r)},1000)}
function newQuestion(r){r.phase='question';r.answered=new Set();r.remaining=r.duration;emit(r);tick(r)}
function hostRoom(s){const r=rooms.get(s.data?.code);return r?.host===s.id?r:null}
io.on('connection',s=>{
 s.on('create',(_,cb)=>{const c=code(),token=crypto.randomBytes(18).toString('hex');const r={code:c,token,host:s.id,players:new Map(),phase:'lobby',set:'places',index:0,round:0,duration:30,remaining:0,answered:new Set(),timer:null};rooms.set(c,r);s.join(c);s.data={code:c,host:true};ack(cb,{ok:true,code:c,token});emit(r)});
 s.on('restoreHost',({code:c,token},cb)=>{const r=rooms.get(c);if(!r||r.token!==token)return ack(cb,{error:'Host session not found'});r.host=s.id;s.join(c);s.data={code:c,host:true};ack(cb,{ok:true});emit(r)});
 s.on('join',({code:c,name},cb)=>{const r=rooms.get(String(c||''));if(!r)return ack(cb,{error:'Room not found. Ask your teacher for a new code.'});if(r.phase==='finished')return ack(cb,{error:'This game has ended'});name=String(name||'').trim().slice(0,24).replace(/[<>]/g,'');if(!name)return ack(cb,{error:'Please enter a nickname'});if([...r.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()&&p.connected))return ack(cb,{error:'Nickname already in use'});const id=crypto.randomBytes(12).toString('hex');r.players.set(id,{name,score:0,correct:0,connected:true,socket:s.id});s.join(r.code);s.data={code:r.code,id};ack(cb,{ok:true,id,code:r.code});emit(r)});
 s.on('rejoin',({code:c,id},cb)=>{const r=rooms.get(c),p=r?.players.get(id);if(!p)return ack(cb,{error:'Session not found'});p.socket=s.id;p.connected=true;s.join(c);s.data={code:c,id};ack(cb,{ok:true});emit(r)});
 s.on('start',({set,duration},cb)=>{const r=hostRoom(s);if(!r)return ack(cb,{error:'Teacher only'});if(!SETS[set])return ack(cb,{error:'Unknown challenge'});stop(r);r.set=set;r.index=0;r.round++;r.duration=Math.min(60,Math.max(15,Number(duration)||30));newQuestion(r);ack(cb,{ok:true})});
 s.on('answer',({choice},cb)=>{const r=rooms.get(s.data?.code),p=r?.players.get(s.data?.id);if(!r||!p||r.phase!=='question'||r.answered.has(s.data.id))return ack(cb,{error:'Answer already submitted or time is up'});if(!Number.isInteger(choice)||choice<0||choice>3)return ack(cb,{error:'Invalid choice'});r.answered.add(s.data.id);const correct=choice===SETS[r.set].questions[r.index].answer;if(correct){p.score+=100+Math.round(r.remaining/r.duration*20);p.correct++}ack(cb,{ok:true,correct});if(r.answered.size>0&&r.answered.size >= [...r.players.values()].filter(p=>p.connected).length)reveal(r);else emit(r)});
 s.on('next',(_,cb)=>{const r=hostRoom(s);if(!r)return ack(cb,{error:'Teacher only'});if(r.phase!=='reveal')return ack(cb,{error:'Wait for the round to finish'});r.index++;if(r.index>=SETS[r.set].questions.length){r.phase='finished';stop(r);emit(r)}else newQuestion(r);ack(cb,{ok:true})});
 s.on('end',()=>{const r=hostRoom(s);if(r){stop(r);r.phase='finished';emit(r)}});
 s.on('disconnect',()=>{const r=rooms.get(s.data?.code);const p=r?.players.get(s.data?.id);if(p&&p.socket===s.id){p.connected=false;emit(r)}})
});
app.get('/qr/:code.png',async(req,res)=>{res.type('png');try{res.send(await QRCode.toBuffer(`${req.protocol}://${req.get('host')}/?join=${encodeURIComponent(req.params.code)}`,{width:400,margin:2}))}catch(e){res.sendStatus(500)}});
server.listen(process.env.PORT||3000,()=>console.log('Wonderful World Reading Quest running'));
