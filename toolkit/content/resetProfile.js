/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ResetProfile.jsm");

// based on onImportItemsPageShow from migration.js
function populateResetPane(aContainerID) {
  let resetProfileItems = document.getElementById(aContainerID);
  try {
    let dataTypes = ResetProfile.getMigratedData();
    for (let dataType of dataTypes) {
      let label = document.createElement("label");
      label.setAttribute("value", dataType);
      resetProfileItems.appendChild(label);
    }
  } catch (ex) {
    Cu.reportError(ex);
  }
}

function onResetProfileLoad() {
  populateResetPane("migratedItems");
}

<<<<<<< HEAD
=======
/**
 * Check if reset is supported for the currently running profile.
 *
 * @return boolean whether reset is supported.
 */
function resetSupported() {
  let profileService = Cc["@mozilla.org/toolkit/profile-service;1"].
                       getService(Ci.nsIToolkitProfileService);
  let currentProfileDir = Services.dirsvc.get("ProfD", Ci.nsIFile);

  // Reset is only supported for the default profile if the self-migrator used for reset exists.
  try {
    if (currentProfileDir.equals(profileService.selectedProfile.rootDir) &&
        "@mozilla.org/toolkit/profile-migrator;1" in Cc) {
      let pm = Cc["@mozilla.org/toolkit/profile-migrator;1"].createInstance(Ci.nsIProfileMigrator);
      return ("canMigrate" in pm) && pm.canMigrate("self");
    }
  } catch (e) {
    // Catch exception when there is no selected profile.
    Cu.reportError(e);
  }
  return false;
}

function getMigratedData() {
  Components.utils.import("resource:///modules/MigrationUtils.jsm");

  // From migration.properties
  const MIGRATED_TYPES = [
    4,  // History and Bookmarks
    16, // Passwords
    8,  // Form History
    2,  // Cookies
  ];

  // Loop over possible data to migrate to give the user a list of what will be preserved.
  let dataTypes = [];
  for (let itemID of MIGRATED_TYPES) {
    try {
      let typeName = MigrationUtils.getLocalizedString(itemID + "_self");
      dataTypes.push(typeName);
    } catch (x) {
      // Catch exceptions when the string for a data type doesn't exist.
      Components.utils.reportError(x);
    }
  }
  return dataTypes;
}

>>>>>>> Bug 756390 - Make the "Reset Firefox" feature more generic
function onResetProfileAccepted() {
  let retVals = window.arguments[0];
  retVals.reset = true;
}
