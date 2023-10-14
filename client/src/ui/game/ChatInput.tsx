import './ChatInput.scss';

const input = document.createElement('input');
input.type = 'text';
input.id = 'chat';
input.placeholder = 'Type your message...';
input.maxLength = 35;
input.autocomplete = 'off';

export default input;
