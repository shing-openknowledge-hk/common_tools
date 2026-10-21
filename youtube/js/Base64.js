class Base64{
	static decode(base64)
	{
		var json = decodeURIComponent( escape(atob(base64) ));
		return JSON.parse(json);
		//const encodedString = btoa(unescape(encodeURIComponent(jsonString)));

		// 输出编码后的字符串
		// return encodedString;

	}
	static encode(jsonObject)
	{
		
		// 将JSON对象转换为字符串
		const jsonString = JSON.stringify(jsonObject);

		// 对字符串进行Base64编码
		const encodedString = btoa(unescape(encodeURIComponent(jsonString)));

		// 输出编码后的字符串
		return encodedString;
	}
}