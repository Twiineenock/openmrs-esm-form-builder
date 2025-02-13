import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { CopyButton, IconButton } from '@carbon/react';
import { Draggable, Edit, TrashCan } from '@carbon/react/icons';
import { showModal, ChevronDownIcon, ChevronUpIcon } from '@openmrs/esm-framework';
import MarkdownWrapper from '../markdown-wrapper/markdown-wrapper';
import type { Schema, Question } from '@types';
import styles from './draggable-question.scss';
// import Question from '../modals/question/question-form/question/question.component';

interface DraggableQuestionProps {
  handleDuplicateQuestion: (question: Question, pageId: number, sectionId: number) => void;
  onSchemaChange: (schema: Schema) => void;
  pageIndex: number;
  question: Question;
  questionCount: number;
  questionIndex: number;
  schema: Schema;
  sectionIndex: number;
  children?: React.ReactNode;
  nestedQuestionIndex?: number
}

const DraggableQuestion: React.FC<DraggableQuestionProps> = ({
  handleDuplicateQuestion,
  onSchemaChange,
  pageIndex,
  question,
  questionCount,
  questionIndex,
  schema,
  sectionIndex,
  children,
  nestedQuestionIndex
}) => {
  const { t } = useTranslation();
  const defaultEnterDelayInMs = 300;
  const draggableId = nestedQuestionIndex ? `question-${pageIndex}-${sectionIndex}-${questionIndex}-${nestedQuestionIndex}` : `question-${pageIndex}-${sectionIndex}-${questionIndex}`;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapse = () => {
    if (question.questions) {
      setIsCollapsed(!isCollapsed)
    }
  };

  const launchEditQuestionModal = useCallback(() => {
    const dispose = showModal('question-modal', {
      formField: question,
      closeModal: () => dispose(),
      onSchemaChange,
      schema,
      questionIndex,
      pageIndex,
      sectionIndex,
    });
  }, [onSchemaChange, pageIndex, question, questionIndex, schema, sectionIndex]);

  const launchDeleteQuestionModal = useCallback(() => {
    const dispose = showModal('delete-question-modal', {
      closeModal: () => dispose(),
      pageIndex,
      sectionIndex,
      question,
      questionIndex,
      onSchemaChange,
      schema,
    });
  }, [onSchemaChange, pageIndex, question, questionIndex, schema, sectionIndex]);

  const { setNodeRef, attributes, listeners, transform, transition, over, isDragging } = useSortable({
    id: question?.id,
    data: {
      type: nestedQuestionIndex ? 'obsQuestion' : 'question',
      question: {
        handleDuplicateQuestion: handleDuplicateQuestion,
        onSchemaChange: onSchemaChange,
        pageIndex: pageIndex,
        question: question,
        questionCount: questionCount,
        questionIndex: questionIndex,
        schema: schema,
        sectionIndex: sectionIndex
      },
    },
  })

  // const { over, isDragging } = useDraggable({
  //   id: question.id,
  //   disabled: questionCount <= 1,
  // });
  // https://www.youtube.com/shorts/AFhWRYRhiCg

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // const { attributes, listeners, transform, isDragging, over, setNodeRef } = useDraggable({
  //   id: draggableId,
  //   disabled: questionCount <= 1,
  // });

  const handleDuplicate = useCallback(() => {
    if (!isDragging) {
      handleDuplicateQuestion(question, pageIndex, sectionIndex);
    }
  }, [handleDuplicateQuestion, isDragging, question, pageIndex, sectionIndex]);

  return (
    <div
      ref={setNodeRef}
      className={classNames(styles.question, {
        [styles.dragContainer]: true,
        [styles.dragContainerWhenDragging]: isDragging,
      })}
      style={style}
      >
      <div
        className={classNames(styles.questionHeader, {
          [styles.obsGroup]: question?.questions
        })}
        onClick={toggleCollapse}
      >
        <div className={styles.iconAndName}>
          <div ref={setNodeRef} {...attributes} {...listeners}>
            <IconButton
              className={styles.dragIcon}
              enterDelayMs={over ? 6000 : defaultEnterDelayInMs}
              label={t('dragToReorder', 'Drag to reorder')}
              kind="ghost"
              size="md"
            >
              <Draggable />
            </IconButton>
          </div>
          <p className={styles.questionLabel}>
            {question?.questionOptions.rendering === 'markdown' ? (
              <MarkdownWrapper markdown={question?.value} />
            ) : (
              question?.label
            )}
          </p>
        </div>
        <div className={styles.buttonsContainer}>
          <CopyButton
            align="top"
            className="cds--btn--sm"
            feedback={t('duplicated', 'Duplicated') + '!'}
            iconDescription={t('duplicateQuestion', 'Duplicate question')}
            kind="ghost"
            onClick={handleDuplicate}
          />
          <IconButton
            enterDelayMs={defaultEnterDelayInMs}
            label={t('editQuestion', 'Edit question')}
            kind="ghost"
            onClick={launchEditQuestionModal}
            size="md"
          >
            <Edit />
          </IconButton>
          <IconButton
            enterDelayMs={defaultEnterDelayInMs}
            label={t('deleteQuestion', 'Delete question')}
            kind="ghost"
            onClick={launchDeleteQuestionModal}
            size="md"
          >
            <TrashCan />
          </IconButton>
          {question?.questions && (
            <span className={styles.collapseIconWrapper}>
            {isCollapsed ? (
              <ChevronDownIcon className={styles.collapseIcon} aria-label="Expand" />
            ) : (
              <ChevronUpIcon className={styles.collapseIcon} aria-label="Collapse" />
            )}
          </span>
          )}
        </div>
      </div>
      {question?.questions && (
        <div
          className={classNames(styles.obsQuestions, {
            [styles.hiddenAccordion]: isCollapsed,
            [styles.accordionContainer]: !isCollapsed,
          })}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default DraggableQuestion;
