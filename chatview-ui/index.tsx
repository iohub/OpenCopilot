import React from 'react'

import ReactDOM from 'react-dom/client'

import { App } from './App'

import './index.css'

import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
    <React.StrictMode>
        <App vscodeAPI={getVSCodeAPI()} />
    </React.StrictMode>
)
