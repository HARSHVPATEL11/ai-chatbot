import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  // =========================
  // LOAD CHATS FROM STORAGE
  // =========================

  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem("aiChats");

      if (!saved) {
        return [];
      }

      const parsedChats = JSON.parse(saved);

      if (!Array.isArray(parsedChats)) {
        return [];
      }

      return parsedChats;
    } catch (error) {
      console.error("Chat storage error:", error);

      localStorage.removeItem("aiChats");

      return [];
    }
  });

  const [activeChatId, setActiveChatId] = useState(null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  // =========================
  // THEME
  // =========================

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  // =========================
  // SEARCH
  // =========================

  const [searchTerm, setSearchTerm] = useState("");

  // =========================
  // AUTO SCROLL
  // =========================

  const messagesEndRef = useRef(null);

  // =========================
  // SAVE CHATS
  // =========================

  useEffect(() => {
    try {
      localStorage.setItem(
        "aiChats",
        JSON.stringify(chats)
      );
    } catch (error) {
      console.error(
        "Unable to save chats:",
        error
      );
    }
  }, [chats]);

  // =========================
  // SAVE THEME
  // =========================

  useEffect(() => {
    try {
      localStorage.setItem(
        "theme",
        theme
      );
    } catch (error) {
      console.error(
        "Unable to save theme:",
        error
      );
    }
  }, [theme]);

  // =========================
  // AUTO SCROLL
  // =========================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chats, loading]);

  // =========================
  // CURRENT CHAT
  // =========================

  const activeChat = chats.find(
    (chat) => chat.id === activeChatId
  );

  const messages = activeChat
    ? activeChat.messages
    : [];

  // =========================
  // SEARCH CHATS
  // =========================

  const filteredChats = chats.filter((chat) =>
    chat.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // =========================
  // NEW CHAT
  // =========================

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [
      newChat,
      ...prev,
    ]);

    setActiveChatId(newChat.id);

    setMessage("");

    setSearchTerm("");
  };

  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = async () => {
    if (!message.trim() || loading) {
      return;
    }

    let chatId = activeChatId;

    let currentChats = chats;

    // Create chat automatically
    if (!chatId) {
      const newChat = {
        id: Date.now(),
        title: message.slice(0, 25),
        messages: [],
      };

      currentChats = [
        newChat,
        ...chats,
      ];

      chatId = newChat.id;

      setChats(currentChats);

      setActiveChatId(chatId);
    }

    const currentChat =
      currentChats.find(
        (chat) => chat.id === chatId
      );

    const userMessage = message;

    const updatedMessages = [
      ...(currentChat?.messages || []),

      {
        role: "user",
        text: userMessage,
      },
    ];

    // =========================
    // UPDATE USER MESSAGE
    // =========================

    const chatsWithUserMessage =
      currentChats.map(
        (chat) =>
          chat.id === chatId
            ? {
                ...chat,

                title:
                  chat.messages.length === 0
                    ? userMessage.slice(
                        0,
                        25
                      )
                    : chat.title,

                messages:
                  updatedMessages,
              }
            : chat
      );

    setChats(
      chatsWithUserMessage
    );

    setMessage("");

    setLoading(true);

    try {
      // =========================
      // BACKEND REQUEST
      // =========================

      const response = await fetch(
        "https://ai-chatbot-kwv1.onrender.com/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            messages:
              updatedMessages,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Backend error"
        );
      }

      // =========================
      // AI RESPONSE
      // =========================

      const finalMessages = [
        ...updatedMessages,

        {
          role: "ai",

          text:
            data.reply ||
            "No response received",
        },
      ];

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,

                messages:
                  finalMessages,
              }
            : chat
        )
      );
    } catch (error) {
      console.error(
        "Frontend Error:",
        error
      );

      // =========================
      // ERROR MESSAGE
      // =========================

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,

                messages: [
                  ...updatedMessages,

                  {
                    role: "ai",

                    text:
                      "❌ " +
                      error.message,
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RENAME CHAT
  // =========================

  const renameChat = (
    id,
    oldTitle
  ) => {
    const newTitle = prompt(
      "Enter new chat name:",
      oldTitle
    );

    if (!newTitle?.trim()) {
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === id
          ? {
              ...chat,

              title:
                newTitle.trim(),
            }
          : chat
      )
    );
  };

  // =========================
  // DELETE CHAT
  // =========================

  const deleteChat = (id) => {
    const remainingChats =
      chats.filter(
        (chat) =>
          chat.id !== id
      );

    setChats(
      remainingChats
    );

    if (
      activeChatId === id
    ) {
      setActiveChatId(
        remainingChats.length >
          0
          ? remainingChats[0]
              .id
          : null
      );
    }
  };

  // =========================
  // CLEAR ALL CHATS
  // =========================

  const clearAllChats = () => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete all chats?"
      );

    if (!confirmDelete) {
      return;
    }

    setChats([]);

    setActiveChatId(null);

    setSearchTerm("");

    localStorage.removeItem(
      "aiChats"
    );
  };

  // =========================
  // CLEAR CURRENT CHAT
  // =========================

  const clearCurrentChat = () => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,

              messages: [],
            }
          : chat
      )
    );
  };

  // =========================
  // ENTER KEY
  // =========================

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage();
    }
  };

  // =========================
  // TOGGLE THEME
  // =========================

  const toggleTheme = () => {
    setTheme((prev) =>
      prev === "dark"
        ? "light"
        : "dark"
    );
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div
      className={`app ${theme}-theme`}
    >

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="sidebar-top">

          <h2>
            🤖 AI Chat
          </h2>

          <button
            className="new-chat-btn"
            onClick={
              createNewChat
            }
          >
            + New Chat
          </button>

        </div>

        {/* =========================
            SEARCH
        ========================= */}

        <div className="search-box">

          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

          {searchTerm && (
            <button
              className="search-clear"
              onClick={() =>
                setSearchTerm("")
              }
            >
              ✕
            </button>
          )}

        </div>

        {/* =========================
            CHAT HISTORY
        ========================= */}

        <div className="chat-history">

          {filteredChats.length ===
          0 ? (

            <p className="empty-history">

              {searchTerm
                ? "No chats found"
                : "No chats yet"}

            </p>

          ) : (

            filteredChats.map(
              (chat) => (

                <div
                  key={chat.id}

                  className={`history-item ${
                    activeChatId ===
                    chat.id
                      ? "active-chat"
                      : ""
                  }`}

                  onClick={() =>
                    setActiveChatId(
                      chat.id
                    )
                  }
                >

                  <span className="chat-title">
                    💬 {chat.title}
                  </span>

                  {/* RENAME */}

                  <button
                    className="rename-chat"

                    onClick={(e) => {
                      e.stopPropagation();

                      renameChat(
                        chat.id,
                        chat.title
                      );
                    }}
                  >
                    ✏️
                  </button>

                  {/* DELETE */}

                  <button
                    className="delete-chat"

                    onClick={(e) => {
                      e.stopPropagation();

                      deleteChat(
                        chat.id
                      );
                    }}
                  >
                    🗑️
                  </button>

                </div>

              )
            )

          )}

        </div>

        {/* =========================
            CLEAR ALL
        ========================= */}

        {chats.length > 0 && (

          <button
            className="clear-all-btn"
            onClick={
              clearAllChats
            }
          >
            🗑️ Clear All Chats
          </button>

        )}

      </aside>

      {/* =========================
          MAIN CHAT
      ========================= */}

      <section className="chat-section">

        {/* =========================
            HEADER
        ========================= */}

        <header className="header">

          <h1>
            🤖 My AI Assistant
          </h1>

          <div className="header-actions">

            {/* THEME */}

            <button
              className="theme-btn"

              onClick={
                toggleTheme
              }

              title="Change Theme"
            >
              {theme ===
              "dark"
                ? "☀️"
                : "🌙"}
            </button>

            {/* CLEAR CURRENT CHAT */}

            {activeChat && (

              <button
                className="clear-btn"

                onClick={
                  clearCurrentChat
                }
              >
                Clear Chat
              </button>

            )}

          </div>

        </header>

        {/* =========================
            CHAT AREA
        ========================= */}

        <main className="chat-container">

          {/* =========================
              NO ACTIVE CHAT
          ========================= */}

          {!activeChat && (

            <div className="welcome">

              <div className="robot">
                🤖
              </div>

              <h2>
                Hello! 👋
              </h2>

              <p>
                Start a new
                conversation
                with your AI
                Assistant.
              </p>

              <button
                className="start-btn"

                onClick={
                  createNewChat
                }
              >
                + Start New Chat
              </button>

            </div>

          )}

          {/* =========================
              EMPTY CHAT
          ========================= */}

          {activeChat &&
            messages.length ===
              0 && (

              <div className="welcome">

                <div className="robot">
                  🤖
                </div>

                <h2>
                  New Chat 👋
                </h2>

                <p>
                  Ask me anything.
                  I am your AI
                  Assistant.
                </p>

              </div>

          )}

          {/* =========================
              MESSAGES
          ========================= */}

          {messages.map(
            (msg, index) => (

              <div
                key={index}

                className={`message-row ${
                  msg.role ===
                  "user"
                    ? "user-row"
                    : "ai-row"
                }`}
              >

                <div className="avatar">

                  {msg.role ===
                  "user"
                    ? "👤"
                    : "🤖"}

                </div>

                <div
                  className={`message ${
                    msg.role ===
                    "user"
                      ? "user-message"
                      : "ai-message"
                  }`}
                >

                  {msg.role ===
                  "ai" ? (

                    <ReactMarkdown>

                      {msg.text.replace(
                        /\*\*([\*\_#`])/g,
                        "$1"
                      )}

                    </ReactMarkdown>

                  ) : (

                    msg.text

                  )}

                </div>

              </div>

            )
          )}

          {/* =========================
              LOADING
          ========================= */}

          {loading && (

            <div className="message-row ai-row">

              <div className="avatar">
                🤖
              </div>

              <div className="message ai-message typing">

                <span></span>
                <span></span>
                <span></span>

              </div>

            </div>

          )}

          {/* =========================
              AUTO SCROLL TARGET
          ========================= */}

          <div
            ref={
              messagesEndRef
            }
          />

        </main>

        {/* =========================
            INPUT
        ========================= */}

        <div className="input-area">

          <textarea
            value={message}

            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }

            onKeyDown={
              handleKeyDown
            }

            placeholder="Message AI Assistant..."

            rows="1"
          />

          <button
            className="send-btn"

            onClick={
              sendMessage
            }

            disabled={
              loading
            }
          >

            {loading
              ? "..."
              : "➤"}

          </button>

        </div>

      </section>

    </div>
  );
}

export default App;