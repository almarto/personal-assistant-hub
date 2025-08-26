import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{B as d}from"./Button-DGjuVaIk.js";import{C as c}from"./Card-DdCIGXUg.js";import"./iframe-Cpc-BwD0.js";import"./preload-helper-D9Z9MdNV.js";const g={title:"Components/Card",component:c,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:{type:"select"},options:["default","interactive","disabled"]},hoverable:{control:{type:"boolean"}},noPadding:{control:{type:"boolean"}}}},a={args:{children:e.jsxs("div",{children:[e.jsx("h3",{children:"Card Title"}),e.jsx("p",{children:"This is a basic card with default styling and padding."})]})}},n={args:{variant:"interactive",hoverable:!0,children:e.jsxs("div",{children:[e.jsx("h3",{children:"Interactive Card"}),e.jsx("p",{children:"This card has interactive styling and hover effects."}),e.jsx("p",{children:"Try hovering over it!"})]})}},r={args:{variant:"disabled",children:e.jsxs("div",{children:[e.jsx("h3",{children:"Disabled Card"}),e.jsx("p",{children:"This card appears disabled and cannot be interacted with."})]})}},i={args:{variant:"interactive",hoverable:!0,children:e.jsxs("div",{children:[e.jsx("h3",{children:"Card with Action"}),e.jsx("p",{children:"This card contains interactive elements like buttons."}),e.jsx(d,{variant:"primary",children:"Take Action"})]})}},t={args:{noPadding:!0,children:e.jsxs("div",{style:{padding:"2rem",backgroundColor:"#f0f0f0"},children:[e.jsx("h3",{children:"Custom Layout Card"}),e.jsx("p",{children:"This card has no default padding, allowing for custom layouts."}),e.jsx("p",{children:"The gray background shows the custom padding applied."})]})}},o={args:{children:e.jsxs("div",{children:[e.jsx("h3",{children:"Card with Long Content"}),e.jsx("p",{children:"This card demonstrates how the component handles longer content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}),e.jsx("p",{children:"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."})]})}},s={args:{children:e.jsx("p",{children:"Minimal card content"})}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div>
        <h3>Card Title</h3>
        <p>This is a basic card with default styling and padding.</p>
      </div>
  }
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'interactive',
    hoverable: true,
    children: <div>
        <h3>Interactive Card</h3>
        <p>This card has interactive styling and hover effects.</p>
        <p>Try hovering over it!</p>
      </div>
  }
}`,...n.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'disabled',
    children: <div>
        <h3>Disabled Card</h3>
        <p>This card appears disabled and cannot be interacted with.</p>
      </div>
  }
}`,...r.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'interactive',
    hoverable: true,
    children: <div>
        <h3>Card with Action</h3>
        <p>This card contains interactive elements like buttons.</p>
        <Button variant="primary">Take Action</Button>
      </div>
  }
}`,...i.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    noPadding: true,
    children: <div style={{
      padding: '2rem',
      backgroundColor: '#f0f0f0'
    }}>
        <h3>Custom Layout Card</h3>
        <p>This card has no default padding, allowing for custom layouts.</p>
        <p>The gray background shows the custom padding applied.</p>
      </div>
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div>
        <h3>Card with Long Content</h3>
        <p>
          This card demonstrates how the component handles longer content. 
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do 
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut 
          enim ad minim veniam, quis nostrud exercitation ullamco laboris 
          nisi ut aliquip ex ea commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse 
          cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat 
          cupidatat non proident, sunt in culpa qui officia deserunt mollit 
          anim id est laborum.
        </p>
      </div>
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    children: <p>Minimal card content</p>
  }
}`,...s.parameters?.docs?.source}}};const v=["Default","Interactive","Disabled","WithButton","NoPadding","LongContent","MinimalContent"];export{a as Default,r as Disabled,n as Interactive,o as LongContent,s as MinimalContent,t as NoPadding,i as WithButton,v as __namedExportsOrder,g as default};
