import './ChatInput.scss';

export interface ChatOverlay {
  root: HTMLDivElement;
  input: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
}

export function createChatOverlay(): ChatOverlay {
  const root = document.createElement('div');
  root.className = 'sb-chat';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'chat';
  input.className = 'sb-chat-input';
  input.placeholder = 'Type your message...';
  input.maxLength = 60;
  input.autocomplete = 'off';
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('enterkeyhint', 'send');

  const mkBtn = (cls: string, label: string, key: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-chat-btn ' + cls;
    b.appendChild(document.createTextNode(label));
    const k = document.createElement('span');
    k.className = 'sb-chat-key';
    k.textContent = ' (' + key + ')';
    b.appendChild(k);
    return b;
  };
  const buttons = document.createElement('div');
  buttons.className = 'sb-chat-buttons';
  const sendBtn = mkBtn('send', 'Send', 'Enter');
  const cancelBtn = mkBtn('cancel', 'Cancel', 'Del');
  buttons.appendChild(cancelBtn);
  buttons.appendChild(sendBtn);

  root.appendChild(input);
  root.appendChild(buttons);

  return { root, input, sendBtn, cancelBtn };
}

export default { createChatOverlay };
