import MarkdownIt from 'markdown-it';
import mdHighlight from 'markdown-it-highlightjs';
import { io } from 'socket.io-client';
import katex from 'katex';
import markdownItKatex from 'markdown-it-katex';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python.js';
import javascript from 'highlight.js/lib/languages/javascript.js';
import html from 'highlight.js/lib/languages/xml.js';
import latex from 'highlight.js/lib/languages/latex.js';
import markdownItTexmath from 'markdown-it-texmath';
import { getUser } from './utility.js';
import { on } from 'codemirror';
//import katex from 'markdown-it-katex'

export var sourceCodes = [];
let containerID = 0;
let currentStart = 0;

//add a global variable to store session id. ToDo: need to find a better way to store session id
export var current_session_id = '';

var currentIndex = 0;

//setup socket.io for Juypter notebook

const socket = io('wss://codexserver.eastasia.cloudapp.azure.com:8000/ws', { transports: ['websocket'], path: '/ws/socket.io' });
//const socket = io('ws://20.239.59.151:8000/ws', { transports: ['websocket'], path: '/ws/socket.io' });
console.log("socket is ", socket);

socket.on('connect', () => {
  console.log("connected");
});

function outputHandler(e) {
  console.log("output received: " + e.data);
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML += `\n ${e.data}`;
}

function errorHandler(e) {
  var err = JSON.stringify(e)
  console.log("error occurred: " + err);
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML +=`Error Message:\n ${err}`;
}

function imageHandler(e) {
  var data = JSON.parse(e.data)
  console.log("image received: " + data['text/plain']);
  var image_data = data['image/png']
  document.getElementById(`runningResult${currentIndex+1}`).innerHTML += `<img src="data:image/png;base64,${image_data}" alt="Figure"/>`;
}

socket.on('output', (e) => outputHandler(e));
socket.on('error', (e) => errorHandler(e));
socket.on('image', (e) => imageHandler(e));

export function renderMarkdown(content) {

  hljs.registerLanguage('python', python);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('html', html);
  //hljs.registerLanguage('latex', latex);

  //const markdown = MarkdownIt({ linkify: true, breaks: true }).use(mdHighlight,{hljs: hljs}).use(markdownItTexmath, {engine: katex, delimiters: ['dollars', 'beg_end'], katexOptions: {macros: {'\\RR': '\\mathbb{R}'}}});
  const markdown = MarkdownIt({ linkify: true, breaks: true }).use(mdHighlight,{hljs: hljs});

  //only render fenced code block, not working
  //markdown.disable(['block']);
  //markdown.enable(['fence']);

  const fence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    const language = token.info.trim();

    

    // Todo: Add latex support, worked 1/9/2024
    if (language === 'latex') {

      //return katex.renderToString(token.content, {throwOnError: false});
      return token.content

    }

    const rawCode = fence?.(...args);

    if (language !== 'python' && language !== 'javascript' && language !== 'js' && language !== 'html') {
      return rawCode;
    }

    let cell_id = crypto.randomUUID();
    sourceCodes.push({'language':language, 'content': token.content, 'cell_id': cell_id});

    // ToDo: Tried to add highlight.js support in the middle of Markdown fence handling, but it seems not working. Still use mdHighlight plugin
    // Need to study how to add specific language support for mdHighlight plugin

    // const highlightedCode = hljs.highlight(rawCode, { language }).value;

    // let regexPattern = /^\`\`\`python\n|^\`\`\`javascript\n|^\`\`\`js\n|^\`\`\`html\n|\n\`\`\`$/gm;
    // let regexPattern = /^<pre><code class="language-python">|^<pre><code class="language-javascript">|^<pre><code class="language-js">|^<pre><code class="language-html">|<\/code><\/pre>$/gm;
    // let strippedCode = highlightedCode.replace(regexPattern, '');

    // console.log("highlightedCode: " + highlightedCode);

    containerID += 1;

    return `<div style="position: relative";>
              <div style="display: flex; flex-direction: column; width: 100%; background: #f0f0f0; border-radius: 0px; padding: 4px 8px; font-size: 18px;">
                <div id="formatedCode${containerID}" style="overflow: auto; color: black; min-height: 100px;">${rawCode}</div>
                <div style="display: none;">
                  <textarea id="rawCode${containerID}" style="overflow: auto; width: 100%; height: 100%; border: none; background: transparent; resize: none; outline: none; padding: 4px 8px; font-size: 18px; color: black;"></textarea>
                </div>
              </div>
              <div id="buttonContainer${containerID}" style="position: relative; top: 0; left: 0; right: 0; bottom: 0; cursor: pointer; border-radius: 0px; display: flex; justify-content: right; align-items: center;">
              </div>
              <div id="runningResult${containerID}" style="position: relative; top: 0; left: 0; right: 0; bottom: 0; background: #f0f0f0; border-radius: 0px; font-size: 18px; display: flex; color: black">
              </div>
            </div>
            `;
  };

  return markdown.render(content);
}

export async function runCode(index) {

  //update current index
  currentIndex = index;

  try {
    if(sourceCodes[index].language === 'html') {
      let dynamichtml = document.getElementById(`runningResult${index+1}`);

      const separatedContent = separateHTMLAndScript(sourceCodes[index].content);
      console.log(separatedContent.html); // HTML without scripts
      console.log(separatedContent.scripts); // Array of script strings

      dynamichtml.innerHTML = separatedContent.html;

      // Todos: remove the style for body element, or it will affect the whole page
      // Done Dec 28 2023
      
      dynamichtml.innerHTML += `<style>${separatedContent.style}</style>`;

      // Function to get a snapshot of the current global symbols
      function getGlobalSymbols() {
        return Object.getOwnPropertyNames(window);
      }

      // Get the initial list of global symbols
      const initialSymbols = getGlobalSymbols();

      loadScriptsInOrder(dynamichtml, separatedContent.scripts, function() {
        console.log('All scripts loaded in order!');
        // Your code to run after all scripts have been loaded

        // Get the updated list of global symbols
        const newSymbols = getGlobalSymbols();

        // Find out which symbols are new by comparing the before and after lists
        const addedSymbols = newSymbols.filter(symbol => !initialSymbols.includes(symbol));

        // Do something with the list of added symbols
        console.log('Newly added symbols:', addedSymbols);

      });

      return;
    }

    // Support Jupyter notebook
    //const response = await fetch("https://127.0.0.1:8000/execute", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/execute", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: sourceCodes[index].content,
        language: sourceCodes[index].language,
        session_id: current_session_id,
        user_id: getUser(),
        description: "This is a test description",
        cell_id: sourceCodes[index].cell_id
      })
    });

    if (!response.ok) {
      throw new Error('Network response not ok');
    }

    document.getElementById(`runningResult${index+1}`).innerHTML = "Running...";

    const data = await response.json(); // parse the JSON from the response

    console.log("response: " + JSON.stringify(data));

    if(data['message'] !== undefined){
      document.getElementById(`runningResult${index+1}`).innerHTML += data['message'];
      if(data['session_id'] !== undefined && data['session_id'] !== null){
        current_session_id = data['session_id'];
        console.log("current_session_id: " + current_session_id);
        console.log("cell_id: " + data['cell_id']);
        document.getElementById('session_id').innerHTML = current_session_id;
      }
    }

  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

export function registerButton(){

  // Attach the event listener only once to the parent container

  for(let i=currentStart + 1; i<=containerID; i++) {

    console.log("buttonContainer" + i);

    // Create a new button element for Run Code
    let button = document.createElement('button');
            
    button.textContent = 'Run Code';
    button.style.fontSize = '16px';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.background = '#4CAF50';
    button.style.color = 'white';
    button.style.marginRight = '2px';
    button.style.marginLeft = '2px';
    
    document.getElementById(`buttonContainer${i}`).appendChild(button);

    // Create a new button element for Edit Code
    button = document.createElement('button');
            
    button.textContent = 'Edit Done';
    button.id = `editDone${i}`;
    button.style.fontSize = '16px';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.background = '#4CAF50';
    button.style.color = 'white';
    button.style.display = 'none';
    button.style.marginRight = '2px';
    button.style.marginLeft = '2px';

    document.getElementById(`buttonContainer${i}`).appendChild(button);

    // Create a new button element for Save Code
    button = document.createElement('button');
            
    button.textContent = 'Save Code';
    button.style.fontSize = '16px';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.background = '#4CAF50';
    button.style.color = 'white';
    button.style.marginRight = '2px';
    button.style.marginLeft = '2px';

    document.getElementById(`buttonContainer${i}`).appendChild(button);
  };

  currentStart = containerID;
}

function separateHTMLAndScript(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Object to hold script contents and HTML content
  const result = {
      scripts: [],
      html: "",
      style: ""
  };

  // Function to recursively extract scripts and return clean HTML
  const extractScripts = (node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];

          // If child is a script element, store its content and remove it
          if (child.tagName === 'SCRIPT') {
              if(child.src) {
                let script = document.createElement('script');
                script.src = child.src;
                script.type = 'text/javascript';
                result.scripts.push(script);
              }
              else {
                let script = document.createElement('script');
                script.text = child.textContent || child.innerText;
                script.type = 'text/javascript';
                result.scripts.push(script);
              }
              node.removeChild(child);
              i--; // Adjust iterator after removing child
          } else if (child.childNodes.length > 0) {
              // If the child has its own children, recurse into those
              extractScripts(child);
          }
      }
  };

  // Execute extraction function starting from the body element

  extractScripts(doc);

  let headStyleElements = doc.getElementsByTagName('style');
  
  let style = headStyleElements.length > 0 ? headStyleElements[0] : null;

  // remove body style rules from the style element

  if (style) {
    var styles = style.innerHTML;

    // Use regex to remove any <body> tag selector and its immediate curly braces block
    // This regex looks for 'body' followed by any number of whitespace and/or other characters (non-greedy), 
    // then an opening brace, then any number of characters (including new lines and spaces) until the next closing brace.  
    var bodyStyleRegex = /body\s*{[^}]*}/gmi;

    // Replace body style rules with an empty string
    var cleanedStyles = styles.replace(bodyStyleRegex, '');

    // Set the style element's content to the new CSS without the body rules
    style.innerHTML = cleanedStyles;
  }


  console.log("style: " + (style ? style.innerHTML : "No style"));

  result.html = doc.body.innerHTML;
  result.style = style ? style.innerHTML : "";

  return result;
}

function loadScriptsInOrder(node, scripts, callback) {
  function loadScript(script) {
      return new Promise((resolve, reject) => {
          console.log("script appended: " + script);
          script.onload = ()=>{
              console.log("script loaded: " + script);
              resolve();
          }
          script.onerror = ()=>reject();
          node.appendChild(script);
          if (script.src ==='') {
            resolve();
          }
          // Resolve the promise immediately, this could be problematic, but onload event seems not fired. This is a workaround
      });
  }

  const promiseChain = scripts.reduce((chain, script) => {
      return chain.then(() => loadScript(script));
  }, Promise.resolve());

  // Once all scripts are loaded, you can run a callback function
  promiseChain.then(() => {
      if (typeof callback === 'function') {
          callback();
      }
  }).catch(error => {
      console.log('A script failed to load:', error);
  });
}

export async function save_cell(index, session_id, user_id, description) {

  //const response = await fetch("https://127.0.0.1:8000/sessions", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/sessions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'save_cell',
        code: sourceCodes[index].content,
        language: sourceCodes[index].language,
        session_id: session_id,
        user_id: getUser(),
        description: "This is a test description",
        cell_id: sourceCodes[index].cell_id
      })
    });

  if (!response.ok) {
      throw new Error('Network response not ok');
  }

  const data = await response.json(); // parse the JSON from the response

  console.log("response: " + JSON.stringify(data));

  if(data['message'] !== undefined){
    document.getElementById(`runningResult${index+1}`).innerHTML += data['message'];
    if(data['session_id'] !== undefined && data['session_id'] !== null){
      current_session_id = data['session_id'];
      console.log("current_session_id: " + current_session_id);
      console.log("cell_id: " + data['cell_id']);
      document.getElementById('session_id').innerHTML = current_session_id;
    }
  }
}

export async function retrieve_sessions(user_id) {

  //const response = await fetch("https://127.0.0.1:8000/sessions", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/sessions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'retrieve_sessions',
        code: '',
        language: '',
        session_id: '',
        user_id: getUser(),
        description: '',
        cell_id: ''
      })
    });

  if (!response.ok) {
      throw new Error('Network response not ok');
  }

  const data = await response.json(); // parse the JSON from the response

  console.log("response: " + JSON.stringify(data));

  if(data['message'] !== undefined){

    var ul = document.createElement('ul');
    data.session_ids.forEach(function(item) {
        var li = document.createElement('li');
        li.innerHTML = createSessionItem(item);

        li.addEventListener('click', function(event) {
          onSessionClick(event, item);
        });
        li.style.cursor = 'pointer';
        ul.appendChild(li);

        var deleteButton = li.querySelector(`#delete${item}`);
        deleteButton.addEventListener('click', function(event) {
          event.stopPropagation();
          onSessionDeleteClick(event, item);
        });
    });

    document.getElementById("session_container").appendChild(ul);
    console.log(data['message']);
  }
}

// Define a button to help on server code testing
const logoutLink = document.getElementById('test_link');
logoutLink.addEventListener('click', function(event) {
  event.preventDefault();
  console.log('Testing');
  retrieve_sessions(getUser());
});

function createSessionItem(session_id) {
  return `<div class="session-item">
            <a href="#" class="session-link">
              <span class="session-id">${session_id}</span>
            </a>
            <span id="delete${session_id}">&times;</span>
            <div id=${session_id}></div>
          </div>`;
}

function createCodeSnippetItem(code) {
  return `<div class="code-snippet-item">
            <a href="#" class="code-snippet-link">
              <span class="code-snippet">${code}</span>
            </a>
            <span id="delete${code}">&times;</span>
          </div>`;
}

async function onSessionClick(event, session_id) {
  event.preventDefault();
  console.log(session_id + 'Clicked');

  //const response = await fetch("https://127.0.0.1:8000/sessions", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/sessions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'retrieve_code',
        code: '',
        language: '',
        session_id: session_id,
        user_id: getUser(),
        description: '',
        cell_id: ''
      })
    });

  if (!response.ok) {
      throw new Error('Network response not ok');
  }

  current_session_id = session_id;
  document.getElementById('session_id').innerHTML = current_session_id;

  const data = await response.json(); // parse the JSON from the response

  console.log("response: " + JSON.stringify(data));

  if(data['message'] !== undefined){

    var ul = document.createElement('ul');
    if(data.code === undefined || data.code === null) {
      console.log("No code snippet found");
      return;
    }

    data.code.forEach(function(item) {
        var li = document.createElement('li');
        li.innerHTML = createCodeSnippetItem(item.cell_id);
        li.addEventListener('click', function(event) {
          event.stopPropagation();
          onCodeClick(event, item);
        });
        li.style.cursor = 'pointer';
        ul.appendChild(li);

        var deleteButton = li.querySelector(`#delete${item.cell_id}`);
        deleteButton.addEventListener('click', function(event) {
          event.stopPropagation();
          onCodeDeleteClick(event, item.cell_id);
        });

    });

    document.getElementById(session_id).appendChild(ul);
    console.log(data['message']);
  }

}

function onCodeClick(event, code) {
  event.preventDefault();
  console.log(code.cell_id + 'Clicked');
  
  let msgContainer = document.querySelector('#message_container');
  msgContainer.innerHTML += createCodeblock(code.language, code.code);
}

function createCodeblock(language, code) {
  let markdown = renderMarkdown(`\`\`\`${language}\n${code}\`\`\``); 
  return `<div class="code-block">
              <span>${markdown}</span>
          </div>`;
}

async function onSessionDeleteClick(event, session_id) {
  event.preventDefault();
  console.log(session_id + 'Deleted');

  //const response = await fetch("https://127.0.0.1:8000/sessions", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/sessions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'delete_session',
        code: '',
        language: '',
        session_id: session_id,
        user_id: getUser(),
        description: '',
        cell_id: ''
      })
    });

  if (!response.ok) {
      throw new Error('Network response not ok');
  }

   event.target.parentNode.remove();
}

async function onCodeDeleteClick(event, cell_id) {
  event.preventDefault();
  console.log(cell_id + 'Deleted');

  //const response = await fetch("https://127.0.0.1:8000/sessions", {
    const response = await fetch("https://codexserver.eastasia.cloudapp.azure.com:8000/sessions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'delete_cell',
        code: '',
        language: '',
        session_id: current_session_id,
        user_id: getUser(),
        description: '',
        cell_id: cell_id
      })
    });

  if (!response.ok) {
      throw new Error('Network response not ok');
  }

   event.target.parentNode.remove();
}