import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatDistanceToNow } from 'date-fns'; // Import this for relative time formatting

export default function ForumCard() {
  const [data, setData]: [any, any] = useState(null);

  useEffect(() => {
    api.get(`${api.endpoint}/stats/forum?now=${Date.now()}`, (data) => {
      if (data.error) return alert(data.error);
      setData(data);
    });
  }, []);

  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '10px',
    paddingLeft: '5px',
    paddingRight: '5px',
    margin: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    transition: '0.3s',
    backgroundColor: '#f9f9f9',
    cursor: 'pointer',
  };

  const titleStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '0px',
    marginTop: '5px'
  };

  const infoStyle = {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
    marginTop: '0px'
  };

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
        <div className="forum-card" key={topic.id} style={cardStyle} onClick={() => redirectToTopic(topic.id)}>
          <h3 style={titleStyle}>{topic.title}</h3>
          <p style={infoStyle}>Posted by {userNameFromId(topic.posters.find((e: {description:string})=>e.description.includes("Original Poster"))?.user_id)} | {topic.views} Views | {formatDistanceToNow(new Date(topic.created_at))} ago</p>
        </div>
      ))}
      {(!data || !data?.topic_list?.topics || data?.topic_list?.topics?.length === 0) && <div>None found :(</div>}
    </div>
  );
}
