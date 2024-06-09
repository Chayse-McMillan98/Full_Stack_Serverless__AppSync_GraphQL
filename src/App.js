import React, { useEffect, useReducer } from 'react';
import { List, Input, Button } from 'antd';
import 'antd/dist/reset.css'
import { v4 as uuid } from 'uuid';

import { listNotes } from './graphql/queries';
import {
  createNote as CreateNote,
  deleteNote as DeleteNote,
  updateNote as UpdateNote
} from './graphql/mutations';

//import { API } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

// Real Time Data (GraphQL Subscription)
import { onCreateNote } from './graphql/subscriptions';

const client = generateClient();
const CLIENT_ID = uuid();

// App State
const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' }
};

const styles = {
  container: { padding: 20 },
  input: { marginBottom: 10 },
  item: { textAlign: 'left' },
  p: { color: '#1890ff' }
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.notes, loading: false };
    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };
    case 'RESET_FORM':
      return { ...state, form: initialState.form };
    case 'SET_INPUT':
      return {...state, form: { ...state.form, [action.name]: action.value }};
    case 'ERROR':
      return { ...state, loading: false, error: true };
    default:
      return state; 
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * Fetch Notes From AWS GraphQL (AppSync)
   */
  async function fetchNotes() {
    try {
      const notesData = await client.graphql({
        query: listNotes
      });

      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items })
    } catch(err) {
      console.log('error: ', err);
      dispatch({ type: 'ERROR' })
    }
  }

  /**
   * Create Notes Using AWS GraphQL (AppSync)
   */
  async function createNote() {
    const { form } = state;
    if(!form.name || !form.description) {
      return alert('please enter a name and description');
    }

    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() };
    dispatch({ type: 'ADD_NOTE', note });
    dispatch({ type: 'RESET_FORM '});

    try {
      await client.graphql({
        query: CreateNote,
        variables: { input: note }
      });
      console.log('Successfully Created Note!');
    } catch(err) {
      console.log('Error: '+err);
    }
  }

  /**
   * Delete Notes Using AWS GraphQL (AppSync)
   */
  async function deleteNote({ id }) {
    const index = state.notes.findIndex(n => n.id === id);
    const notes = [
      ...state.notes.slice(0, index),
      ...state.notes.slice(index + 1)
    ];
    
    dispatch({ type: 'SET_NOTES', notes });
    try {
      await client.graphql({
        query: DeleteNote,
        variables: { input: { id }}
      });
      console.log('successfully deleted note!');
    } catch(err) {
      console.log({ err });
    }
  }

  /**
   * Update Notes Using AWS GraphQL (AppSync)
   */
  async function updateNote(note) {
    const index = state.notes.findIndex(n => n.id === note.id);
    const notes = [...state.notes];
    
    notes[index].completed = !note.completed;
    dispatch({ type: 'SET_NOTES', notes });

    try {
      await client.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed }}
      });
      console.log('note successfully updated');
    }catch(err) {
      console.log('Error: '+err);
    }
  }


  // Create Note UI Input Handler
  function onChange(e) {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value });
  }

  function renderItem(item) {
    return (
      <List.Item 
        style={styles.item}
        actions={[
          <Button style={styles.p} onClick={() => deleteNote(item)}>Delete</Button>,
          <Button style={styles.p} onClick={() => updateNote(item)}>{
            item.completed ? 'completed' : 'mark complete'
          }</Button>
        ]}
      >
        <List.Item.Meta
          title={item.name}
          description={item.description}
        />
      </List.Item>
    )
  }

  useEffect(() => {

    // Init Notes From AWS
    fetchNotes()

    // Subscribe to AWS GraphQL (Notes Creation)
    const subscription = client
      .graphql({ query: onCreateNote })
      .subscribe({
        next: noteData => {
          const note = noteData.data.onCreateNote
          if(CLIENT_ID === note.clientId) return // We created the note!
          dispatch({ type: 'ADD_NOTE', note })
        }
      })
    return () => subscription.unsubscribe();

    /*
      // TEST WITH THIS IN THE AWS CONSOLE:

      mutation MyMutation {
        createNote(input: {name: "Server DEMOOOOO", description: "test", completed: false}) {
          id
          name
          description
          completed
          clientId
          updatedAt
          createdAt
        }
      }
      
    */

  }, [])


  return (
    <div style={styles.container}>
      <Input
        onChange={onChange}
        value={state.form.name}
        placeholder='Note Name'
        name='name'
        style={styles.input}
      />

      <Input
        onChange={onChange}
        value={state.form.description}
        placeholder='Note Description'
        name='description'
        style={styles.input}
      />

      <Button
        onClick={createNote}
        type='primary'
      >Create Note</Button>

      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      ></List>
    </div>
  );
}

export default App;
