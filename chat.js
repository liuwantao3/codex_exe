import bot from './assets/bot.svg'
import user from './assets/user.svg'
import { renderMarkdown, registerButton, runCode, sourceCodes } from './markdown';
import renderMathInElement from "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.mjs";

import _CodeMirror from 'codemirror/lib/codemirror.js';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/python/python.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/addon/edit/matchbrackets.js';

export const CodeMirror = _CodeMirror;
var htmlEditor

const chatContainer = document.querySelector('#chat_container');
const chatForm = document.querySelector('#chat_form');
const messageContainer = document.querySelector('#message_container');

let loadInterval

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

function typeText(element, text) {
    let index = 0

    let interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index)
            index++
        } else {
            clearInterval(interval)
        }
    }, 20)
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
    return (
        `
        <div class="wrapper ${isAi && 'ai'}">
            <div class="chat">
                <div class="profile">
                    <img 
                      src=${isAi ? bot : user} 
                      alt="${isAi ? 'bot' : 'user'}" 
                    />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>
    `
    )
}

const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(chatForm)

    // user's chatstripe
    messageContainer.innerHTML += chatStripe(false, data.get('prompt'))

    // to clear the textarea input 
    chatForm.reset()

    // bot's chatstripe
    const uniqueId = generateUniqueId()
    messageContainer.innerHTML += chatStripe(true, " ", uniqueId)

    // to focus scroll to the bottom 
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // specific message div 
    const messageDiv = document.getElementById(uniqueId)

    // messageDiv.innerHTML = "..."
    loader(messageDiv)

    const token = localStorage.getItem('jwtToken');
    const response = await fetch("https://openaiserverlwt.azurewebsites.net",{
    //const response = await fetch('http://localhost:5000', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            prompt: data.get('prompt')
        })
    })

    clearInterval(loadInterval)
    messageDiv.innerHTML = " "

    if (response.status === 401 || response.status === 403) {
      const loginContainer = document.getElementById("login_container");
      loginContainer.style.display = "block";

      const chatContainer = document.getElementById('chat_container');
      chatContainer.style.display = 'none';

      messageContainer.innerHTML = ''; //clean the previous chat contents and token
      localStorage.removeItem('jwtToken');
    } else if (response.ok) {
        const data = await response.json();
        const parsedData = data.bot.trim(); // trims any trailing spaces/'\n' 

        console.log(parsedData); // See the response from GPT

        /* covert to Markdown */
        const markdown = renderMarkdown(parsedData);

        messageDiv.innerHTML = markdown;

        registerButton();

        // Tried to render math in the middle of markdown, but it doesn't work
        // Below code was working

        // renderMathInElement(messageDiv, {
        //     delimiters: [
        //         {left: '$$', right: '$$', display: true},
        //         {left: '$', right: '$', display: true},
        //         {left: '\\(', right: '\\)', display: true},
        //         {left: '\\[', right: '\\]', display: true}
        //     ],
        //     ignoredTags: [
        //         'script', 'noscript', 'style', 'textarea', 'annotation', 'annotation-xml'
        //     ],
        //     throwOnError : false
        //   });

    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
}

// Event listener for chat form submission
chatForm.addEventListener('submit', handleSubmit);
chatForm.addEventListener('keyup', (e) => {
  if (e.keyCode === 13) {
      handleSubmit(e)
  }
})

messageContainer.addEventListener('click', function(event) {
  // Check if the clicked element is a button
  console.log(`${event.target.tagName.toLowerCase()} from container ${event.target.id} was clicked`);
  if (event.target.tagName.toLowerCase() === 'button') {
    // Extract the index 'i' from the button's container ID
    const index = event.target.parentNode.id.replace('buttonContainer', '');
    if (event.target.textContent === 'Run Code') {
        runCode(Number(index) - 1);
    }
    else if (event.target.textContent === 'Save Code') {
        
        event.target.style.display = 'none';
        const formatedNode = document.getElementById('formatedCode' + index);
        const rawNode = document.getElementById("rawCode" + index);

        
        // All work around for highlight, can't add \n but space and some comments
        if (sourceCodes[Number(index) - 1].language === 'html') {
            formatedNode.innerHTML = renderMarkdown("```html <!DOCTYPE html>\n" + sourceCodes[Number(index) - 1].content + "```");
            //formatedNode.innerHTML = renderMarkdown(sourceCodes[Number(index) - 1].content);

        } else if (sourceCodes[Number(index) - 1].language === 'python') {
            formatedNode.innerHTML = renderMarkdown("```python #Python code" + sourceCodes[Number(index) - 1].content + "```");
            //formatedNode.innerHTML = renderMarkdown(sourceCodes[Number(index) - 1].content);
            console.log("Python code is " + rawNode.value);
        }else if (sourceCodes[Number(index) - 1].language === 'javascript') {
            formatedNode.innerHTML = renderMarkdown("```javascript //Node.js code" + sourceCodes[Number(index) - 1].content + "```");
            //formatedNode.innerHTML = renderMarkdown(sourceCodes[Number(index) - 1].content);
        }

        formatedNode.style.display = 'block';
        
        formatedNode.style.height = `${parseInt(rawNode.parentNode.style.height) - 50}px`;
        rawNode.parentNode.querySelector('.CodeMirror').remove();
        rawNode.parentNode.style.display = 'none';
    }
  }
  else if (event.target.tagName.toLowerCase() === 'code') {
    console.log("code clicked" + event.target.parentNode.parentNode.id);
    const id = event.target.parentNode.parentNode.id;
    const index = id.replace('formatedCode', '');
    const formatedNode = document.getElementById(id);
    const rawNode = document.getElementById("rawCode" + index);

    rawNode.parentNode.style.width = "100%";
    rawNode.parentNode.style.height = `${(parseInt(formatedNode.scrollHeight) + 50)}px`;
    console.log("scrollheight is " + parseInt(formatedNode.scrollHeight));
    rawNode.parentNode.style.display = 'block';

    // Add CodeMirror support
    console.log("index is " + index);
    rawNode.value = sourceCodes[Number(index) - 1].content;
    // determine the language type and set the mode
    let mode = '';
    if(sourceCodes[Number(index) - 1].language === 'html') {
        mode = 'text/html';
    } else {
        mode = sourceCodes[Number(index) - 1].language;
    }
    htmlEditor = CodeMirror.fromTextArea(rawNode, {
        lineNumbers: true,
        mode: mode,
        theme: "material",
        autofocus: true,
        indentUnit: 4,
        indentWithTabs: true,
        marchBrackets: true,
        linewrapping: true,
        extraKeys: {
            "Tab": "indentMore"
        }
    });

    sourceCodes[Number(index) - 1].editor = htmlEditor;

    //closure
    function createChangeHandler(index, rawNode) {
        return function () {
          let htmlEditor = sourceCodes[Number(index) - 1].editor;
          sourceCodes[Number(index) - 1].content = htmlEditor.getValue();
          rawNode.value = htmlEditor.getValue();
          console.log("index is " + index);
        };
    }

    htmlEditor.on("change", createChangeHandler(index, rawNode));
    
    formatedNode.style.display = 'none';
    htmlEditor.setSize("100%", `${(parseInt(rawNode.parentNode.style.height) - 100)}px`);
    htmlEditor.setValue(sourceCodes[Number(index) - 1].content);
    htmlEditor.refresh();
    htmlEditor.focus();
    rawNode.parentNode.click();

    
    const saveButton = document.getElementById(`saveCode${index}`);

    saveButton.style.display = 'block';
    
    
  }
  else if (event.target.id.substring(0, 12) === 'formatedCode') {
    console.log("code clicked" + event.target.id);
    const id = event.target.id;
    const index = id.replace('formatedCode', '');
    const formatedNode = document.getElementById(id);
    const rawNode = document.getElementById("rawCode" + index);
    const saveButton = document.getElementById(`saveCode${index}`);

    saveButton.style.display = 'block';
    
    rawNode.parentNode.style.width = "100%";
    rawNode.parentNode.style.height = `${(parseInt(formatedNode.scrollHeight) + 50)}px`;
    console.log("scrollheight is " + parseInt(formatedNode.scrollHeight));

    rawNode.parentNode.style.display = 'block';

    // Add CodeMirror support
    console.log("index is " + index);
    rawNode.value = sourceCodes[Number(index) - 1].content;
    // determine the language type and set the mode
    let mode = '';
    if(sourceCodes[Number(index) - 1].language === 'html') {
        mode = 'text/html';
    } else {
        mode = sourceCodes[Number(index) - 1].language;
    }
    htmlEditor = CodeMirror.fromTextArea(rawNode, {
        lineNumbers: true,
        mode: mode,
        theme: "material",
        autofocus: true,
        indentUnit: 4,
        indentWithTabs: true,
        marchBrackets: true,
        linewrapping: true,
        extraKeys: {
            "Tab": "indentMore"
        }
    });

    sourceCodes[Number(index) - 1].editor = htmlEditor;

    //closure
    function createChangeHandler(index, rawNode) {
        return function () {
            let htmlEditor = sourceCodes[Number(index) - 1].editor;
            sourceCodes[Number(index) - 1].content = htmlEditor.getValue();
            rawNode.value = htmlEditor.getValue();
            console.log("index is " + index);
        };
        }
    htmlEditor.on("change", createChangeHandler(index, rawNode));
    formatedNode.style.display = 'none';
    htmlEditor.setSize("100%", `${(parseInt(rawNode.parentNode.style.height) - 100)}px`);
    console.log("editor height is " + (parseInt(rawNode.parentNode.style.height) - 100));
    
    htmlEditor.setValue(sourceCodes[Number(index) - 1].content);
    
    htmlEditor.refresh();
    htmlEditor.focus();
    rawNode.parentNode.click();
    
  }
});