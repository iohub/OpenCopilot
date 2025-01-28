import React from 'react'

import ReactDOM from 'react-dom/client'

import { SearchPanel } from './SearchPanel'

import './index.css'

import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
    <React.StrictMode>
        <SearchPanel vscodeAPI={getVSCodeAPI()} />
    </React.StrictMode>
)
