import {YoutubeUtils} from './common.js';
chrome.contextMenus.create({
    id: "myMenu",
    title: "Youtube",
    contexts: ["link", "page", "all"], // This makes the context menu appear only when right-clicking on links
	documentUrlPatterns:[
		"https://www.youtube.com/*",
		"https://youtube.com/*"
		// "https://*/*"
	]
	
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "myMenu") {
        // Here you can execute some code
        // For example, sending a message to the content script
		/*
		editable: false
		frameId: 0
		frameUrl: "https://www.google.com/search?q=chrome+extension+download+manager+github&sca_esv=2e926f43141c8c40&sca_upv=1&rlz=1C1CHBF_zh-HKHK1080HK1080&ei=BpnlZrjqL57B0-kPrZa80QM&ved=0ahUKEwi4hf-RzsKIAxWe4DQHHS0LLzoQ4dUDCA8&uact=5&oq=chrome+extension+download+manager+github&gs_lp=Egxnd3Mtd2l6LXNlcnAiKGNocm9tZSBleHRlbnNpb24gZG93bmxvYWQgbWFuYWdlciBnaXRodWIyCBAAGIAEGKIEMggQABiABBiiBDIIEAAYgAQYogQyCBAAGIAEGKIESIIaUMMPWOEYcAJ4AZABAJgBeaABmAaqAQMzLjW4AQPIAQD4AQGYAgegAuQDwgIKEAAYsAMY1gQYR8ICBBAAGB7CAggQIRigARjDBMICChAhGKABGMMEGAqYAwCIBgGQBgeSBwM1LjKgB-0X&sclient=gws-wiz-serp"
		linkUrl: "https://chromewebstore.google.com/detail/gitd-download-manager/cbnplpkljokdodpligcaolkmodfondhl"
		menuItemId: "myMenu"
		pageUrl: "https://www.google.com/search?q=chrome+extension+download+manager+github&sca_esv=2e926f43141c8c40&sca_upv=1&rlz=1C1CHBF_zh-HKHK1080HK1080&ei=BpnlZrjqL57B0-kPrZa80QM&ved=0ahUKEwi4hf-RzsKIAxWe4DQHHS0LLzoQ4dUDCA8&uact=5&oq=chrome+extension+download+manager+github&gs_lp=Egxnd3Mtd2l6LXNlcnAiKGNocm9tZSBleHRlbnNpb24gZG93bmxvYWQgbWFuYWdlciBnaXRodWIyCBAAGIAEGKIEMggQABiABBiiBDIIEAAYgAQYogQyCBAAGIAEGKIESIIaUMMPWOEYcAJ4AZABAJgBeaABmAaqAQMzLjW4AQPIAQD4AQGYAgegAuQDwgIKEAAYsAMY1gQYR8ICBBAAGB7CAggQIRigARjDBMICChAhGKABGMMEGAqYAwCIBgGQBgeSBwM1LjKgB-0X&sclient=gws-wiz-serp"
		[[Prototype]]: Object
		*/
		if(info.linkUrl)
		{
			openYoutubeVideo(info.linkUrl, tab.index+1);
			// openYoutubeVideo(info.linkUrl, tab.index);
		} else if(info.pageUrl)
		{
			var newVideoURL = createPlayerURL(info.pageUrl);
			
			if(newVideoURL)
			{
				/*
				chrome.tabs.create({
					active :false,
					url: newVideoURL// , 
					// index: sender.tab.index + 1
				});
				*/
				// replace the current page url with newVideoURL
				// 
				chrome.tabs.update({
					url: newVideoURL
				});
			}
			
		}
		
		/*
		chrome.runtime.sendMessage({ 
			open_new_tab: true, 
			// url: 'https://www.google.com' 
			url: info.linkUrl
		});
		*/

		/*
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: triggerSomeCode,
        });
		*/
    }
});

function createPlayerURL(url)
{
	var youtubeVideoId = YoutubeUtils.getYoutubeID(url);
	if(youtubeVideoId)
	{
		// window.location.assign(`#${encodeURIComponent(originalYoutubeURL)}`);
		var hash = encodeURIComponent(url);
		
		var newVideoURL = `file:///C:/Users/User/Desktop/extension/youtube/player.html#${hash}`;
		return newVideoURL;
	}
	return null;;
}
function openYoutubeVideo(url, index) {
	var newVideoURL = createPlayerURL(url)
	if(newVideoURL)
	{
		chrome.tabs.create({
			active :false,
			url: newVideoURL, // , 
			index:index
			// index: sender.tab.index + 1
		})
	}
	/*
	var originalYoutubeURL = url;
	var youtubeVideoId = YoutubeUtils.getYoutubeID(url);
	if(youtubeVideoId)
	{
		// window.location.assign(`#${encodeURIComponent(originalYoutubeURL)}`);
		var hash = encodeURIComponent(url);
		
		var newVideoURL = `file:///C:/Users/User/Desktop/extension/youtube/player.html#${hash}`;
		
		console.log("link is ", url);
		chrome.tabs.create({
			active :false,
			url: newVideoURL// , 
			// index: sender.tab.index + 1
		})
	}
	*/
}