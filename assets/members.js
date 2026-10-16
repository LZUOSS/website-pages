const memberCards=[...document.querySelectorAll('.member-card')];
const memberSearch=document.querySelector('#member-search');
const memberCount=document.querySelector('#member-count');
memberSearch.addEventListener('input',()=>{
  const query=memberSearch.value.trim().replace(/^@/,'').toLowerCase();
  let visible=0;
  for(const card of memberCards){card.hidden=!card.dataset.login.includes(query);if(!card.hidden)visible++;}
  memberCount.textContent=query?`${visible} / ${memberCards.length} 位成员`:`${memberCards.length} 位公开成员`;
  document.querySelector('#member-empty').hidden=visible>0;
});
for(const img of document.querySelectorAll('.avatar-frame img')){
  img.addEventListener('error',()=>{img.hidden=true;});
  if(img.complete&&img.naturalWidth===0)img.hidden=true;
}
