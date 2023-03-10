import React, { Component } from 'react';
import NoteForm from './NoteForm';
import NoteList from './NoteList';
import { API, graphqlOperation, Auth } from 'aws-amplify';

import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import {
    onCreateNote,
    onDeleteNote,
    onUpdateNote,
} from './graphql/subscriptions';
import './Notepad.css';

class Notepad extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            notes: [],
            id: '',
            form: '',
            hoveredNote: '', // id
            isHoveredButton: false,
            isHoveredCross: false,
        };
        this.handleAddNote = this.handleAddNote.bind(this);
        this.handleEditNote = this.handleEditNote.bind(this);
        this.handleUpdateNote = this.handleUpdateNote.bind(this);
        this.handleDeleteNote = this.handleDeleteNote.bind(this);
        this.handleChangeNote = this.handleChangeNote.bind(this);
        this.handleCancelUpdate = this.handleCancelUpdate.bind(this);
        this.handleHoveredNote = this.handleHoveredNote.bind(this);
        this.handleHoveredButton = this.handleHoveredButton.bind(this);
        this.handleHoveredCross = this.handleHoveredCross.bind(this);
        this.getNotes = this.getNotes.bind(this);
        this.getUsername = this.getUsername.bind(this);
    }

    async componentDidMount() {
        this.getNotes();
        await this.getUsername();

        this.createNoteListener = API.graphql(
            graphqlOperation(onCreateNote, { owner: this.state.username })
        ).subscribe({
            next: (noteData) => {
                const newNote = noteData.value.data.onCreateNote;
                const prevNotes = this.state.notes.filter(
                    (note) => note.id !== newNote.id
                );
                const updatedNotes = [...prevNotes, newNote];
                this.setState({ notes: updatedNotes });
            },
        });

        this.deleteNoteListener = API.graphql(
            graphqlOperation(onDeleteNote, { owner: this.state.username })
        ).subscribe({
            next: (noteData) => {
                const deletedNote = noteData.value.data.onDeleteNote;
                const updatedNotes = this.state.notes.filter(
                    (note) => note.id !== deletedNote.id
                );
                this.setState({ notes: updatedNotes });
            },
        });

        this.updateNoteListener = API.graphql(
            graphqlOperation(onUpdateNote, { owner: this.state.username })
        ).subscribe({
            next: (noteData) => {
                const updatedNote = noteData.value.data.onUpdateNote;
                const index = this.state.notes.findIndex(
                    (note) => note.id === updatedNote.id
                );
                const updatedNotes = [
                    ...this.state.notes.slice(0, index),
                    updatedNote,
                    ...this.state.notes.slice(index + 1),
                ];
                this.setState({
                    notes: updatedNotes,
                    id: '',
                    form: '',
                });
            },
        });
    }

    componentWillUnmount() {
        this.createNoteListener.unsubscribe();
        this.deleteNoteListener.unsubscribe();
        this.updateNoteListener.unsubscribe();
    }

    getUsername = async () => {
        const resp = await Auth.currentAuthenticatedUser();
        this.setState({ username: resp.username });
    };

    getNotes = async () => {
        const resp = await API.graphql(graphqlOperation(listNotes));
        const updatedNotes = resp.data.listNotes.items;
        this.setState({ notes: updatedNotes });
    };

    hasExistingNote = () => {
        if (this.state.id) {
            const isNote =
                this.state.notes.findIndex(
                    (note) => note.id === this.state.id
                ) > -1;
            return isNote;
        }
        return false;
    };

    handleAddNote = async (e) => {
        e.preventDefault();
        if (this.hasExistingNote()) {
            this.handleUpdateNote();
        } else {
            const input = { note: this.state.form };
            await API.graphql(graphqlOperation(createNote, { input: input }));
            this.setState({
                form: '',
            });
        }
    };

    handleUpdateNote = async () => {
        const input = {
            id: this.state.id,
            note: this.state.form,
        };
        await API.graphql(graphqlOperation(updateNote, { input: input }));
    };

    handleCancelUpdate(e) {
        this.setState({
            form: '',
            id: '',
        });
    }

    handleEditNote(e) {
        this.setState({
            form: e.note,
            id: e.id,
        });
    }

    handleDeleteNote = async (noteId) => {
        const input = { id: noteId };
        await API.graphql(graphqlOperation(deleteNote, { input }));
    };

    handleChangeNote(e) {
        this.setState({ form: e.target.value });
    }

    handleHoveredNote(noteId) {
        this.setState((st) => ({ hoveredNote: noteId }));
    }

    handleHoveredButton(e) {
        this.setState((st) => ({ isHoveredButton: !st.isHoveredButton }));
    }

    handleHoveredCross(e) {
        this.setState((st) => ({ isHoveredCross: !st.isHoveredCross }));
    }

    render() {
        return (
            <div className="center mw8 pa3 vh-100 br4 bg-washed-yellow">
                <h1 className="tc avenir">Notepad</h1>
                <div className="Notepad-container">
                    <NoteForm
                        form={this.state.form}
                        handleAddNote={this.handleAddNote}
                        handleEditNote={this.handleEditNote}
                        handleChangeNote={this.handleChangeNote}
                        handleHoveredButton={this.handleHoveredButton}
                        isUpdate={this.state.id}
                        isHoveredButton={this.state.isHoveredButton}
                    />
                    <NoteList
                        notes={this.state.notes}
                        handleEditNote={this.handleEditNote}
                        handleDeleteNote={this.handleDeleteNote}
                        handleHoveredNote={this.handleHoveredNote}
                        hoveredNote={this.state.hoveredNote}
                        handleHoveredCross={this.handleHoveredCross}
                        isHoveredCross={this.state.isHoveredCross}
                    />
                </div>
            </div>
        );
    }
}

export default Notepad;
