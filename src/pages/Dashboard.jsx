import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { toast } from "react-toastify";
import { LogOut, Plus, Edit2, Check, X, Trash2 } from "lucide-react";

export default function Dashboard({ session }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchNotes();

    // Enable Supabase Real-time updates
    const channel = supabase
      .channel("notes-db")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // Keep UI in sync with backend
          if (payload.eventType === "INSERT") {
            setNotes((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotes((prev) =>
              prev.map((note) => (note.id === payload.new.id ? payload.new : note))
            );
          } else if (payload.eventType === "DELETE") {
            setNotes((prev) => prev.filter((note) => note.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    else setNotes(data || []);
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from("notes").insert([
      { title, user_id: session.user.id },
    ]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Note added!");
      setTitle("");
    }
  };

  const updateNote = async (id) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const { error } = await supabase
      .from("notes")
      .update({ title: editTitle })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Note updated!");
      setEditingId(null);
    }
  };

  const deleteNote = async (id) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.info("Note deleted");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.info("Logged out successfully");
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-content max-w-5xl mx-auto">
          <h1 className="logo text-xl font-bold">My Notes</h1>
          <div className="nav-user flex items-center gap-4">
            <span className="user-email-badge">
              {session.user.email}
            </span>
            <button className="btn-icon btn-danger" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main max-w-5xl mx-auto">
        <div className="note-creator w-full mb-8">
          <div className="card w-full">
            <form onSubmit={addNote} className="flex gap-3">
              <input
                type="text"
                placeholder="What's on your mind? Quickly add a note here..."
                className="input-field flex-1 text-base md:text-lg p-4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary flex items-center gap-2 px-6 font-semibold" 
                disabled={!title.trim()}
              >
                <Plus strokeWidth={3} size={20} /> Add
              </button>
            </form>
          </div>
        </div>

        <div className="notes-grid mt-4">
          {notes.length === 0 ? (
            <div className="empty-state">
              <p>No notes found. Create your first one!</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="note-card card">
                {editingId === note.id ? (
                  <div className="edit-mode flex flex-col gap-3 min-h-full">
                    <input
                      type="text"
                      className="input-field mb-1"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                    />
                    <div className="action-buttons mt-auto">
                      <button className="btn btn-success flex-1" onClick={() => updateNote(note.id)}>
                        <Check size={16} /> Save
                      </button>
                      <button className="btn btn-secondary flex-1" onClick={() => setEditingId(null)}>
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="view-mode flex flex-col justify-between min-h-[120px]">
                    <p className="note-title text-base">{note.title}</p>
                    <div className="note-actions flex justify-end gap-2 mt-4 pt-4 border-t border-slate-700/50">
                      <button
                        className="btn-action edit"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditTitle(note.title);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
