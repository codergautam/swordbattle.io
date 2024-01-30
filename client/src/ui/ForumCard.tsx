import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatDistanceToNow } from 'date-fns'; // Import this for relative time formatting
import './ForumCard.scss';

export default function ForumCard() {
  const [data, setData]: [any, any] = useState(null);

  useEffect(() => {
    api.get(`${api.endpoint}/stats/forum?now=${Date.now()}`, (data) => {
      if (data.error) return;
      setData(data);
    });
  }, []);


  const redirectToTopic = (topicId: number) => {
    // window.location.href = `https://iogames.forum/t/${topicId}`;
    // open on new tab
    window.open(`https://iogames.forum/t/${topicId}`, '_blank');
  };

  const userNameFromId = (id: number)=> {
    return data.users.find((user: any) => user.id === id)?.username;
  }

  if(!data) return (<div>Loading...</div>);
  return (
    <div>
        <h1 style={{margin: 0, marginTop: '5px'}}>Top Community Posts</h1>
      {data && data?.topic_list?.topics && data.topic_list.topics.slice(0, 3).map((topic: any) => (
       <div className="forum-card" key={topic.id} onClick={() => redirectToTopic(topic.id)}>
       <h3 className="forum-title">{topic.title}</h3>
       <p className="forum-info">Posted by {userNameFromId(topic.posters.find((e: {description:string}) => e.description.includes("Original Poster"))?.user_id)} | {topic.views} Views | {formatDistanceToNow(new Date(topic.created_at))} ago</p>
     </div>
      ))}
      {(!data || !data?.topic_list?.topics || data?.topic_list?.topics?.length === 0) && <div>None found :(</div>}
    </div>
  );
}
