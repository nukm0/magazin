import {catalogPreview,withPreviewProfiles} from "../lib/demo";import {seedDemo} from "../lib/demo-seed";import {expiry,initWorkspace} from "../lib/workspace";
// Historic samples are used only in regression tests, never loaded by the application.
export function seededFixture(){const s=seedDemo(withPreviewProfiles(catalogPreview()));s.catalogRevision=3;return expiry(initWorkspace(s));}
