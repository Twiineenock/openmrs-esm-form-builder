import React from 'react';
import classNames from 'classnames';
import { useDroppable } from '@dnd-kit/core';
import styles from './droppable-container.scss';
import type { Question } from '@types';

interface DroppableProps {
  id: string;
  children: React.ReactNode;
  question: Question
}

function Droppable({ id, children, question }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: {
      question: question
    }
  });

  return (
    <div className={classNames(styles.droppable as string, { [styles.isOver]: isOver })} ref={setNodeRef}>
      {children}
    </div>
  );
}

export default Droppable;
