import React from 'react';
import { useUtterances } from '../../hooks/useUtteranc';

const commentNodeId = 'comments';

const Comments = () => {
  useUtterances(commentNodeId);
  return <div id={commentNodeId} />;
};

export default Comments;