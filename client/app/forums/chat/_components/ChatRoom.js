/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import Composer from "./Composer";

export default function ChatRoom({ thread, messages = [], selfId, onSend, onBack }) {
  return (
    <div className={styles.chatRoom}>
      <ChatHeader title={thread?.title} avatar={thread?.avatar} onBack={onBack} />
      {/* 切換房間時重置列表，確保初次就捲到底 */}
      <MessageList key={thread?.id} messages={messages} selfId={selfId} />
      <Composer onSend={onSend} />
    </div>
  );
}
