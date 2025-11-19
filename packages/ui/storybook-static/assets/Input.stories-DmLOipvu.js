import{j as i}from"./jsx-runtime-D_zvdyIk.js";import{I as d}from"./Input-Cy7KB3pj.js";import"./iframe-Cpc-BwD0.js";import"./preload-helper-D9Z9MdNV.js";const b={title:"Components/Input",component:d,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{size:{control:{type:"select"},options:["small","medium","large"]},state:{control:{type:"select"},options:["default","error","success"]},required:{control:{type:"boolean"}},disabled:{control:{type:"boolean"}}}},e={args:{placeholder:"Enter text..."}},r={args:{label:"Email",placeholder:"Enter your email",type:"email"}},a={args:{label:"Password",placeholder:"Enter your password",type:"password",required:!0}},s={args:{label:"Username",placeholder:"Enter username",helperText:"Must be at least 3 characters long"}},o={args:{label:"Email",placeholder:"Enter your email",type:"email",state:"error",errorMessage:"Please enter a valid email address"}},t={args:{label:"Email",placeholder:"Enter your email",type:"email",state:"success",value:"user@example.com"}},l={args:{label:"Small Input",placeholder:"Small size",size:"small"}},n={args:{label:"Large Input",placeholder:"Large size",size:"large"}},c={args:{label:"Disabled Input",placeholder:"Cannot edit",disabled:!0}},p={args:{label:"Search",placeholder:"Search...",icon:i.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[i.jsx("circle",{cx:"11",cy:"11",r:"8"}),i.jsx("path",{d:"m21 21-4.35-4.35"})]})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text...'
  }
}`,...e.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email'
  }
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    required: true
  }
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    helperText: 'Must be at least 3 characters long'
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    state: 'error',
    errorMessage: 'Please enter a valid email address'
  }
}`,...o.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    state: 'success',
    value: 'user@example.com'
  }
}`,...t.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Small Input',
    placeholder: 'Small size',
    size: 'small'
  }
}`,...l.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Large Input',
    placeholder: 'Large size',
    size: 'large'
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true
  }
}`,...c.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Search',
    placeholder: 'Search...',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
  }
}`,...p.parameters?.docs?.source}}};const y=["Default","WithLabel","Required","WithHelperText","WithError","Success","Small","Large","Disabled","WithIcon"];export{e as Default,c as Disabled,n as Large,a as Required,l as Small,t as Success,o as WithError,s as WithHelperText,p as WithIcon,r as WithLabel,y as __namedExportsOrder,b as default};
