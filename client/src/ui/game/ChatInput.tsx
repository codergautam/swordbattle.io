import './ChatInput.scss';

const input = document.createElement('input');
input.type = 'text';
input.id = 'chat';
input.placeholder = 'Type your message...';
input.maxLength = 35;
input.autocomplete = 'off';

const sendButton = document.createElement('button');
sendButton.id = 'send';
sendButton.innerText = 'Send';

const elements = { input, sendButton };
export default elements;
