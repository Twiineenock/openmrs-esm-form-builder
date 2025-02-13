import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { Accordion, AccordionItem, Button, IconButton, InlineLoading } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import DraggableQuestion from './draggable/draggable-question.component';
import Droppable from './droppable/droppable-container.component';
import EditableValue from './editable/editable-value.component';
import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import type { FormSchema } from '@openmrs/esm-form-engine-lib';
import type { Schema, Question } from '@types';
import styles from './interactive-builder.scss';
import { createPortal } from 'react-dom';

interface ValidationError {
  errorMessage?: string;
  warningMessage?: string;
  field: { label: string; concept: string; id?: string; type?: string };
}

interface InteractiveBuilderProps {
  isLoading: boolean;
  onSchemaChange: (schema: Schema) => void;
  schema: Schema;
  validationResponse: Array<ValidationError>;
}

const InteractiveBuilder: React.FC<InteractiveBuilderProps> = ({
  isLoading,
  onSchemaChange,
  schema,
  validationResponse,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<any>(null)
  const [activeObsQuestion ,setActiveObsQuestion] = useState(null)
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // Enable sort function when dragging 10px 💡 here!!!
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, keyboardSensor);

  const { t } = useTranslation();
  const { formUuid } = useParams<{ formUuid: string }>();
  const isEditingExistingForm = Boolean(formUuid);

  const initializeSchema = useCallback(() => {
    const dummySchema: FormSchema = {
      name: '',
      pages: [],
      processor: 'EncounterFormProcessor',
      encounterType: '',
      referencedForms: [],
      uuid: '',
    };

    if (!schema) {
      onSchemaChange({ ...dummySchema });
    }

    return schema || dummySchema;
  }, [onSchemaChange, schema]);

  const launchNewFormModal = useCallback(() => {
    const schema = initializeSchema();
    const dispose = showModal('new-form-modal', {
      closeModal: () => dispose(),
      schema,
      onSchemaChange,
    });
  }, [onSchemaChange, initializeSchema]);

  const launchAddPageModal = useCallback(() => {
    const dispose = showModal('new-page-modal', {
      closeModal: () => dispose(),
      schema,
      onSchemaChange,
    });
  }, [schema, onSchemaChange]);

  const launchDeletePageModal = useCallback(
    (pageIndex: number) => {
      const dipose = showModal('delete-page-modal', {
        closeModal: () => dipose(),
        onSchemaChange,
        schema,
        pageIndex,
      });
    },
    [onSchemaChange, schema],
  );

  const launchAddSectionModal = useCallback(
    (pageIndex: number) => {
      const dispose = showModal('new-section-modal', {
        closeModal: () => dispose(),
        pageIndex,
        schema,
        onSchemaChange,
      });
    },
    [schema, onSchemaChange],
  );

  const launchDeleteSectionModal = useCallback(
    (pageIndex: number, sectionIndex: number) => {
      const dispose = showModal('delete-section-modal', {
        closeModal: () => dispose(),
        pageIndex,
        sectionIndex,
        schema,
        onSchemaChange,
      });
    },
    [onSchemaChange, schema],
  );

  const launchAddQuestionModal = useCallback(
    (pageIndex: number, sectionIndex: number) => {
      const dispose = showModal('question-modal', {
        closeModal: () => dispose(),
        onSchemaChange,
        schema,
        pageIndex,
        sectionIndex,
      });
    },
    [onSchemaChange, schema],
  );

  const renameSchema = useCallback(
    (value: string) => {
      try {
        if (value) {
          schema.name = value;
        }

        onSchemaChange({ ...schema });

        showSnackbar({
          title: t('success', 'Success!'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t('formRenamed', 'Form renamed'),
        });
      } catch (error) {
        showSnackbar({
          title: t('errorRenamingForm', 'Error renaming form'),
          kind: 'error',
          subtitle: error?.message,
        });
      }
    },
    [onSchemaChange, schema, t],
  );

  const renamePage = useCallback(
    (name: string, pageIndex: number) => {
      try {
        if (name) {
          schema.pages[pageIndex].label = name;
        }

        onSchemaChange({ ...schema });

        showSnackbar({
          title: t('success', 'Success!'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t('pageRenamed', 'Page renamed'),
        });
      } catch (error) {
        if (error instanceof Error) {
          showSnackbar({
            title: t('errorRenamingPage', 'Error renaming page'),
            kind: 'error',
            subtitle: error?.message,
          });
        }
      }
    },
    [onSchemaChange, schema, t],
  );

  const renameSection = useCallback(
    (name: string, pageIndex: number, sectionIndex: number) => {
      try {
        if (name) {
          schema.pages[pageIndex].sections[sectionIndex].label = name;
        }
        onSchemaChange({ ...schema });

        showSnackbar({
          title: t('success', 'Success!'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t('sectionRenamed', 'Section renamed'),
        });
      } catch (error) {
        if (error instanceof Error) {
          showSnackbar({
            title: t('errorRenamingSection', 'Error renaming section'),
            kind: 'error',
            subtitle: error?.message,
          });
        }
      }
    },
    [onSchemaChange, schema, t],
  );

  const duplicateQuestion = useCallback(
    (question: Question, pageId: number, sectionId: number) => {
      try {
        const questionToDuplicate: Question = JSON.parse(JSON.stringify(question));
        questionToDuplicate.id = questionToDuplicate.id + 'Duplicate';

        schema.pages[pageId].sections[sectionId].questions.push(questionToDuplicate);

        onSchemaChange({ ...schema });

        showSnackbar({
          title: t('success', 'Success!'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t(
            'questionDuplicated',
            "Question duplicated. Please change the duplicated question's ID to a unique, camelcased value",
          ),
        });
      } catch (error) {
        if (error instanceof Error) {
          showSnackbar({
            title: t('errorDuplicatingQuestion', 'Error duplicating question'),
            kind: 'error',
            subtitle: error?.message,
          });
        }
      }
    },
    [onSchemaChange, schema, t],
  );

  // const handleDragEnd = (event: DragEndEvent) => {
  //   const { active, over } = event;

  //   if (active) {
  //     // Get the source information
  //     const activeIdParts = active.id.toString().split('-');
  //     const sourcePageIndex = parseInt(activeIdParts[1]);
  //     const sourceSectionIndex = parseInt(activeIdParts[2]);
  //     const sourceQuestionIndex = parseInt(activeIdParts[3]);
  //     // if (activeIdParts.length === 4) {
  //     //   const sourceNestedQuestionIndex = parseInt(activeIdParts[4]);
  //     // }

  //     // Get the destination information
  //     const destination = over.id.toString().split('-');
  //     const destinationPageIndex = parseInt(destination[2]);
  //     const destinationSectionIndex = parseInt(destination[3]);
  //     const destinationQuestionIndex = parseInt(destination[4]);
  //     // if (destination.length > 5) {
  //     //   const destinationNestedQuestionIndex = parseInt(destination[5])
  //     // }

  //     // Move the question within or across sections
  //     if (activeIdParts.length <= 4 && destination.length <= 5) {
  //       const sourceQuestions = schema.pages[sourcePageIndex].sections[sourceSectionIndex].questions;
  //       const destinationQuestions =
  //         sourcePageIndex === destinationPageIndex && sourceSectionIndex === destinationSectionIndex
  //           ? sourceQuestions
  //           : schema.pages[destinationPageIndex].sections[destinationSectionIndex].questions;
  
  //       const questionToMove = sourceQuestions[sourceQuestionIndex];
  //       sourceQuestions.splice(sourceQuestionIndex, 1);
  //       destinationQuestions.splice(destinationQuestionIndex, 0, questionToMove);

  //       const updatedSchema = {
  //         ...schema,
  //         pages: schema.pages.map((page, pageIndex) => {
  //           if (pageIndex === sourcePageIndex) {
  //             return {
  //               ...page,
  //               sections: page.sections.map((section, sectionIndex) => {
  //                 if (sectionIndex === sourceSectionIndex) {
  //                   return {
  //                     ...section,
  //                     questions: [...sourceQuestions],
  //                   };
  //                 } else if (sectionIndex === destinationSectionIndex) {
  //                   return {
  //                     ...section,
  //                     questions: [...destinationQuestions],
  //                   };
  //                 }
  //                 return section;
  //               }),
  //             };
  //           }
  //           return page;
  //         }),
  //       };

  //       // Update your state or data structure with the updated schema
  //       onSchemaChange(updatedSchema);
  //     } else if (activeIdParts.length === 5 && destination.length === 6) {
  //       const sourceNestedQuestionIndex = parseInt(activeIdParts[4]);
  //       const destinationNestedQuestionIndex = parseInt(destination[5]) 
  //       const sourceQuestions = schema.pages[sourcePageIndex].sections[sourceSectionIndex].questions[sourceNestedQuestionIndex].questions;
  //       const destinationQuestions = schema.pages[destinationPageIndex].sections[destinationSectionIndex].questions[destinationQuestionIndex].questions;

  //       const questionToMove = sourceQuestions[sourceNestedQuestionIndex];
  //       sourceQuestions.splice(sourceQuestionIndex, 1);
  //       destinationQuestions.splice(destinationNestedQuestionIndex, 0, questionToMove);

  //       const updatedSchema = {
  //         ...schema,
  //         pages: schema.pages.map((page, pageIndex) => {
  //           if (pageIndex === sourcePageIndex) {
  //             return {
  //               ...page,
  //               sections: page.sections.map((section, sectionIndex) => {
  //                 if (sectionIndex === sourceSectionIndex) {
  //                   return {
  //                     ...section,
  //                     questions: section.questions.map((question, questionIndex) => {
  //                       if (questionIndex === sourceQuestionIndex) {
  //                         return {
  //                           ...question,
  //                           questions: [...sourceQuestions],
  //                         };
  //                       } else if (questionIndex === destinationQuestionIndex) {
  //                         return {
  //                           ...question,
  //                           questions: [...destinationQuestions],
  //                         };
  //                       }
  //                       return question
  //                     })
  //                   }
  //                 }
  //                 return section;
  //               })
  //             }
  //           }
  //           return page
  //         })
  //       }

  //       // Update your state or data structure with the updated schema
  //       onSchemaChange(updatedSchema);
  //     }


  //   }
  // };

  const getAnswerErrors = (answers: Array<Record<string, string>>) => {
    const answerLabels = answers?.map((answer) => answer.label) || [];
    const errors: Array<ValidationError> = validationResponse.filter((error) =>
      answerLabels?.includes(error.field.label),
    );
    return errors || [];
  };

  const getValidationError = (question: Question) => {
    const errorField: ValidationError = validationResponse.find(
      (error) =>
        error.field.label === question.label && error.field.id === question.id && error.field.type === question.type,
    );
    return errorField?.errorMessage || '';
  };

  interface ObsQuestionsProps {
    question: Question;
    pageIndex: number;
    sectionIndex: number;
    questionIndex: number;
  }

  const ObsQuestions = ({question, pageIndex, sectionIndex, questionIndex}: ObsQuestionsProps)=>{
    const obsQuestionsIds = question.questions.map(question=>question.id)
    return (
      <SortableContext items={obsQuestionsIds}>
        <div className={styles.obsQuestions}>
          {
            question.questions.map((qn, qnIndex)=>{
              return (
                <Droppable
                  id={`droppable-question-${pageIndex}-${sectionIndex}-${questionIndex}-${qnIndex}`}
                  key={qnIndex + 10000}
                >
                  <DraggableQuestion
                    handleDuplicateQuestion={duplicateQuestion}
                    key={qn.id}
                    onSchemaChange={onSchemaChange}
                    pageIndex={pageIndex}
                    question={qn}
                    questionCount={question.questions.length}
                    questionIndex={qnIndex}
                    schema={schema}
                    sectionIndex={sectionIndex}
                    nestedQuestionIndex={qnIndex}
                  />
                </Droppable>
              )
            })
          }
        </div>
      </SortableContext>
    )
  }

  // const quesionsIdsArray = useMemo(() => {
  //   if (!schema?.pages) return [];
  //   return schema?.pages.flatMap((page) =>
  //     page?.sections.flatMap((section) =>
  //       section?.questions.map((question) => question.id)
  //     )
  //   );
  // }, [schema]);

  const quesionsIdsArray = useMemo(() => {
    if (!schema?.pages) return [];
  
    return schema.pages.flatMap((page) =>
      page?.sections?.flatMap((section) =>
        section?.questions?.map((question) => question?.id) || []
      ) || []
    ) || [];
  }, [schema]);

  // const obsQuestionsIds = useMemo(() => {
  //   if (!schema?.pages) return [];
  
  //   return schema.pages.flatMap((page, pageIdx) =>
  //     page?.sections?.flatMap((section, sectionIdx) =>
  //       section?.questions?.flatMap((question, questionIdx) =>
  //         question?.questions?.map((q) => q.id) || []
  //       ) || []
  //     ) || []
  //   );
  // }, [schema]);

  function onDragStart(event: DragStartEvent){
    //eslint-disable-next-line no-console
    console.log("DRAG START", event);
    if(event.active.data.current?.type === "question") {
      setActiveQuestion(event.active.data.current?.question)
      return;
    } else {
      setActiveObsQuestion(event.active.data.current?.question)
      return;
    }
  }

  function insertBeforeId<T extends { id: string | number }>(
    array: T[], 
    targetId: string | number, 
    newElement: T
  ): T[] {
    const index = array.findIndex(element => element.id === targetId);
    return index === -1 ? array : [...array.slice(0, index), newElement, ...array.slice(index)];
  }

  interface HandleDragEnd {
    schema: Schema;
    activeQnId: UniqueIdentifier;
    overQnId: UniqueIdentifier;
  }

  function handleDragEnd({schema, activeQnId, overQnId}: HandleDragEnd) {

    function insertBeforeId<T>(arr: T[], id: string | number, specialElement: T): T[] {
      const index = arr.findIndex(item => (item as any).id === id);
      
      if (index === -1) {
        return arr;
      }

      return [...arr.slice(0, index + 1), specialElement, ...arr.slice(index + 1)];
    }

    let activeQuestion;
    //https://www.youtube.com/shorts/ZRaUo5tMUlc?feature=share
    const shemaWithOutActiveQn = {
      ...schema,
      pages: schema.pages.map((page, pageIndex)=>{
        return {
          ...page,
          sections: page.sections.map((section, sectionIndex)=>{
            return {
              ...section,
              questions: section.questions.filter(item => {
                if(item.id === activeQnId){
                  activeQuestion = item
                }
                return item.id !== activeQnId
              })
            }
          })
        }
      })
    }

    const schemaWithReorderedQns = {
      ...shemaWithOutActiveQn,
      pages: shemaWithOutActiveQn.pages.map((page)=>{
        return {
          ...page,
          sections: page.sections.map(section=>{
            return {
              ...section,
              questions: insertBeforeId(section.questions, overQnId, activeQuestion)
            }
          })
        }
      })
    }
    return schemaWithReorderedQns;
  }

  function onDragEnd(event: DragEndEvent){
    const { active, over } = event;
    if(!over) return;
    const activeQuestionId = active.id;
    const overQuestionId = over.id;
    //eslint-disable-next-line no-console
    // console.log("activeQnId", activeQuestionId);
    //eslint-disable-next-line no-console
    // console.log("overQnId", overQuestionId);
    if(activeQuestionId === overQuestionId) return;

    const updatedSchema = handleDragEnd({
      schema: schema,
      activeQnId: activeQuestionId,
      overQnId: overQuestionId
    })
    //eslint-disable-next-line no-console
    console.log(updatedSchema);
    onSchemaChange(updatedSchema);    
  }

  function onDragOver(event: DragOverEvent){
    const { active, over } = event;
    if(!over) return;
    const activeQuestionId = active.id;
    const overQuestionId = over.id;
    //eslint-disable-next-line no-console
    console.log("activeQnId", activeQuestionId);
    //eslint-disable-next-line no-console
    console.log("overQnId", overQuestionId);
    if(activeQuestionId === overQuestionId) return;

    const isActiveObsQn = active.data.current?.type === 'obsQuestion'
    const isOverObsQn = over.data.current?.type === 'obsQuestion'

    if (!isActiveObsQn) return;

    // if (isActiveObsQn && isOverObsQn) {
      
    // }

    // dropping an obsQn over another obsQn wasHospitalized __wtyHFntq0

    // dropping an obsQn over a question
    const isOverAQuestion = over.data.current?.type === 'question'
    // if (isActiveObsQn && isOverAQuestion) {

    // }

  }

  return (
    <div className={styles.container}>
      {isLoading ? <InlineLoading description={t('loadingSchema', 'Loading schema') + '...'} /> : null}

      {schema?.name && (
        <>
          <div className={styles.header}>
            <div className={styles.explainer}>
              <p>{t('welcomeHeading', 'Welcome to the Interactive Schema builder')}</p>
              <p>
                {t(
                  'welcomeExplainer',
                  'Add pages, sections and questions to your form. The Preview tab automatically updates as you build your form. For a detailed explanation of what constitutes an OpenMRS form schema, please read through the ',
                )}{' '}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={'https://openmrs.atlassian.net/wiki/spaces/projects/pages/68747273/React+Form+Engine'}
                >
                  {t('formBuilderDocs', 'form builder documentation')}.
                </a>
              </p>
            </div>
            <Button
              kind="ghost"
              renderIcon={Add}
              onClick={launchAddPageModal}
              iconDescription={t('addPage', 'Add Page')}
            >
              {t('addPage', 'Add Page')}
            </Button>
          </div>
          <div className={styles.editorContainer}>
            <EditableValue
              elementType="schema"
              id="formNameInput"
              value={schema?.name}
              onSave={(name) => renameSchema(name)}
            />
          </div>
        </>
      )}

      {!isEditingExistingForm && !schema?.name && (
        <div className={styles.header}>
          <p className={styles.explainer}>
            {t(
              'interactiveBuilderHelperText',
              'The Interactive Builder lets you build your form schema without writing JSON code. The Preview tab automatically updates as you build your form. When done, click Save Form to save your form.',
            )}
          </p>

          <Button onClick={launchNewFormModal} className={styles.startButton} kind="ghost">
            {t('startBuilding', 'Start building')}
          </Button>
        </div>
      )}

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        sensors={sensors}
        onDragOver={onDragOver}
      >
        <SortableContext items={quesionsIdsArray}>
          {schema?.pages?.length
            ? schema.pages.map((page, pageIndex) => (
                <div className={styles.editableFieldsContainer} key={pageIndex}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className={styles.editorContainer}>
                      <EditableValue
                        elementType="page"
                        id="pageNameInput"
                        value={schema.pages[pageIndex].label}
                        onSave={(name) => renamePage(name, pageIndex)}
                      />
                    </div>
                    <IconButton
                      enterDelayMs={300}
                      kind="ghost"
                      label={t('deletePage', 'Delete page')}
                      onClick={() => launchDeletePageModal(pageIndex)}
                      size="md"
                    >
                      <TrashCan />
                    </IconButton>
                  </div>
                  <div>
                    {page?.sections?.length ? (
                      <p className={styles.sectionExplainer}>
                        {t(
                          'expandSectionExplainer',
                          'Below are the sections linked to this page. Expand each section to add questions to it.',
                        )}
                      </p>
                    ) : null}
                    {page?.sections?.length ? (
                      page.sections?.map((section, sectionIndex) => (
                        <Accordion key={sectionIndex}>
                          <AccordionItem title={section.label}>
                            <>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div className={styles.editorContainer}>
                                  <EditableValue
                                    elementType="section"
                                    id="sectionNameInput"
                                    value={section.label}
                                    onSave={(name) => renameSection(name, pageIndex, sectionIndex)}
                                  />
                                </div>
                                <IconButton
                                  enterDelayMs={300}
                                  kind="ghost"
                                  label={t('deleteSection', 'Delete section')}
                                  onClick={() => launchDeleteSectionModal(pageIndex, sectionIndex)}
                                  size="md"
                                >
                                  <TrashCan />
                                </IconButton>
                              </div>
                              <div>
                                {section.questions?.length ? (
                                  section.questions.map((question, questionIndex) => {
                                    return (
                                      <Droppable
                                        id={`droppable-question-${pageIndex}-${sectionIndex}-${questionIndex}`}
                                        key={questionIndex}
                                      >
                                        <DraggableQuestion
                                          handleDuplicateQuestion={duplicateQuestion}
                                          key={question?.id}
                                          onSchemaChange={onSchemaChange}
                                          pageIndex={pageIndex}
                                          question={question}
                                          questionCount={section.questions.length}
                                          questionIndex={questionIndex}
                                          schema={schema}
                                          sectionIndex={sectionIndex}
                                        >
                                          <ObsQuestions
                                            question={question}
                                            pageIndex={pageIndex}
                                            sectionIndex={sectionIndex}
                                            questionIndex={questionIndex}
                                          />
                                        </DraggableQuestion>
                                        {getValidationError(question) && (
                                          <div className={styles.validationErrorMessage}>
                                            {getValidationError(question)}
                                          </div>
                                        )}
                                        {getAnswerErrors(question?.questionOptions.answers)?.length ? (
                                          <div className={styles.answerErrors}>
                                            <div>Answer Errors</div>
                                            {getAnswerErrors(question.questionOptions.answers)?.map((error, index) => (
                                              <div
                                                className={styles.validationErrorMessage}
                                                key={index}
                                              >{`${error.field.label}: ${error.errorMessage}`}</div>
                                            ))}
                                          </div>
                                        ) : null}
                                      </Droppable>
                                    );
                                  })
                                ) : (
                                  <p className={styles.explainer}>
                                    {t(
                                      'sectionExplainer',
                                      'A section will typically contain one or more questions. Click the button below to add a question to this section.',
                                    )}
                                  </p>
                                )}

                                <Button
                                  className={styles.addQuestionButton}
                                  kind="ghost"
                                  renderIcon={Add}
                                  onClick={() => {
                                    launchAddQuestionModal(pageIndex, sectionIndex);
                                  }}
                                  iconDescription={t('addQuestion', 'Add Question')}
                                >
                                  {t('addQuestion', 'Add Question')}
                                </Button>
                              </div>
                            </>
                          </AccordionItem>
                        </Accordion>
                      ))
                    ) : (
                      <p className={styles.explainer}>
                        {t(
                          'pageExplainer',
                          'Pages typically have one or more sections. Click the button below to add a section to your page.',
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    className={styles.addSectionButton}
                    kind="ghost"
                    renderIcon={Add}
                    onClick={() => {
                      launchAddSectionModal(pageIndex);
                    }}
                    iconDescription={t('addSection', 'Add Section')}
                  >
                    {t('addSection', 'Add Section')}
                  </Button>
                </div>
              ))
            : null}
        </SortableContext>
        {/* {createPortal(
          <DragOverlay>
            {
              activeQuestion && (
                <DraggableQuestion
                  handleDuplicateQuestion={activeQuestion.handleDuplicateQuestion}
                  key={activeQuestion.question?.id}
                  onSchemaChange={activeQuestion.onSchemaChange}
                  pageIndex={activeQuestion.pageIndex}
                  question={activeQuestion.question}
                  questionCount={activeQuestion.questionCount}
                  questionIndex={activeQuestion.questionIndex}
                  schema={activeQuestion.schema}
                  sectionIndex={activeQuestion.sectionIndex}
                ></DraggableQuestion>
              )
            }
          </DragOverlay>, document.body
        )} */}
      </DndContext>
    </div>
  );
};

export default InteractiveBuilder;
