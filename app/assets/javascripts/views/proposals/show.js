App.Views.ShowProposal = Backbone.View.extend({
	events: {
		'click a[href="#tab_proposal_details"]': "showDetails",
		'click a[href="#tab_panel_details"]': "showPanel",
		'click a[href="#tab_reviewer_expertise"]': "showReviewerExpertise",
		'click a[href="#tab_reviewer_details"]': "showReviewerDetails",
		'change select[id^="panelselect_"]': "changePanel",
		'change select[id^="topicrelevance_"]': "changeTopicRelevance",
		'click a[href="#reviewer_listitem"]': "showReviewerDetail"
	},
	initialize: function(params) {
		_.bindAll(this, 'render');

		var self = this;
		this.model = new Proposal({id: this.id});
		this.model.fetch({
			success: function() {
				self.legend_flags = {};
				//load topic legend
				self.legend_topics = {};
				$.getJSON(apiurl+'topic?legend=topic'+'&jsoncallback=?', function(data) {
					_.each(data, function(item) {
						self.legend_topics[item["topic"]] = {"words":item["words"],"label":item["label"]};
					});
					//prepare data
					self.prepareData();
					//then render
					self.render();
				});
			}
		});
	},
	changePanel: function(e) {
//console.log('changing panel');		
		var id = $(e.currentTarget).attr('id').split('_').pop();
		
		//set it
		this.selectedpanel = $(e.currentTarget).val();
		$("#select[id^=panelselect_]").val(this.selectedpanel);
//console.log(this.selectedpanel);
		
		//clear the tabs
		$("#tab_panel_details", this.el).html('');
		$("#tab_reviewer_expertise", this.el).html('');
		$("#tab_reviewer_details", this.el).html('');
		
		//depending on where we are (which parent tab), either load the panel details or the reviewer expertise
//console.log(id);		
		if (id=='paneldetails') {
			this.showPanel();
		} else if (id=='reviewerexpertise') {
			this.showReviewerExpertise();
		} else {
			this.showReviewerDetails();
		}
	},
	changeTopicRelevance: function(e) {
//console.log('changing relevance');		
		//set it
		this.topicrelevance = $(e.currentTarget).val();
		$("#select[id^=topicrelevance_]", this.el).val(this.topicrelevance);
//console.log(this.topicrelevance);
		
		//clear the tabs
		$("#tab_panel_details_topics", this.el).html('');
		$("#tab_reviewer_expertise_topics", this.el).html('');
		
		//depending on where we are (which parent tab), either load the panel details or the reviewer expertise
		var selectedpanel = this.loadSelectedPanel(this.selectedpanel);
		var topics = selectedpanel.topics;
		var paneltopics = this.getPanelTopics(this.topicrelevance,topics);				
		if ($.trim($('#tab_panel_details', this.el).html())) {
			$("#tab_panel_details_topics").html(this.showPanelDetailsView.renderPanelTopics(paneltopics)); //already loaded, overwrite			
		}
		if ($.trim($('#tab_reviewer_expertise', this.el).html())) {
			//get all the topics
			var reviewertopics = this.showReviewerExpertiseView.getReviewerExpertiseTopics(this.topicrelevance,paneltopics);
//console.log(reviewertopics);			
			$("#tab_reviewer_expertise_topics").html(this.showReviewerExpertiseView.renderReviewerExpertiseTopicsList(reviewertopics));
			$("#tab_reviewer_expertise_topics_venn").html(this.showReviewerExpertiseView.renderReviewerExpertiseTopicsVenn(reviewertopics));
		} //already loaded, overwrite
	},
	prepareData: function() {
		//first, jsonify the stuff we got back so we can play with it
		var proposal = this.model.read();
		var self = this;
		//save the data in this view
		//details
		this.details = proposal.details;
		//researchers
		this.researchers = proposal.researchers;
		//topics
		this.topics = proposal.topics;
		//panels and stuff
		var panels = proposal.panels;
		var reviewers = proposal.reviewers;
//console.log(reviewers);		
		var reviewerproposals = proposal.reviewerproposals;
		this.panels = [];
		//now, let's build a list of complete panels
		if (panels.length>0) {
			_.each(panels, function(panel) {
				var panels_select = '';
				panels_select += '<option value="'+panel.nsf_id+'">'+panel.nsf_id+' - '+panel.name+' ('+panel.officer+')</option>';
				var tmp = {};
				tmp.panel = panel;
				//set reviewers
				var panel_reviewers = _.filter(reviewers,function(reviewer) {
					return reviewer.panel_id==panel.nsf_id;
				});
//console.log(panel_reviewers);				
				tmp.reviewers = [];
				if (panel_reviewers.length>0) tmp.reviewers = panel_reviewers[0].reviewers;
				//now gather topic data
				var t1s = {};
				var t2s = {};
				var t3s = {};
				var t4s = {};
				//find in reviewerproposalslist
				var panel_proposals = _.filter(reviewerproposals,function(reviewerproposal) {
					return reviewerproposal.panel_id==panel.nsf_id;
				});
	//console.log(panel_proposals);				
				//parse the data - dry this out later
				_.each(panel_proposals, function(panel_proposal) {
					_.each(panel_proposal.reviewerproposals, function(reviewerproposal) {
						var topics = reviewerproposal.topics;
						if (topics[0]) {
							if (_.has(t1s,topics[0])) t1s[topics[0]]["count"]++;
							else {
								t1s[topics[0]] = {};
								t1s[topics[0]]["count"] = 1;
							}
						}
						if (topics[1]) {
							if (_.has(t2s,topics[1])) t2s[topics[1]]["count"]++;
							else {
								t2s[topics[1]] = {};
								t2s[topics[1]]["count"] = 1;
							}
						}
						if (topics[2]) {
							if (_.has(t3s,topics[2])) t3s[topics[2]]["count"]++;
							else {
								t3s[topics[2]] = {};
								t3s[topics[2]]["count"] = 1;
							}
						}
						if (topics[3]) {
							if (_.has(t4s,topics[3])) t4s[topics[3]]["count"]++;
							else {
								t4s[topics[3]] = {};
								t4s[topics[3]]["count"] = 1;
							}
						}	
					});
				});
	//console.log(t1s);					
	//console.log(t2s);					
	//console.log(t3s);					
	//console.log(t4s);					
				tmp.topics = [t1s, t2s, t3s, t4s];
	//console.log(topics);				
				tmp.topics_count = _.keys(t1s).length+_.keys(t2s).length+_.keys(t3s).length+_.keys(t4s).length;
	//console.log(tmp);				
				self.panels.push(tmp);
				//set defaults for topic relevance
				self.topicrelevance = '1'; //t0
			});
			//set defaults for selected panels
			this.selectedpanel = this.panels[0].panel.nsf_id; //index of first panel
		}
	},
	render: function() {		
		//load classification legends
		if (_.size(this.legend_flags)==0) {
			var self = this;
			$.getJSON(apiurl+'org?legend=flag'+'&jsoncallback=?', function(data) {
				_.each(data, function(item) {
					self.legend_flags[item["flag"]] = {"label":item["label"]};
				});
				self.showDetails();
			});
		} else {
			this.showDetails();		
		}
	},
	showDetails: function() {
//console.log(self);
		if (this.showProposalDetailsView==undefined) {
			var self = this;
			require(['text!templates/proposals/show_tab_proposal_details.html'], function(html) {
				self.showProposalDetailsView = new App.Views.ShowProposalDetails({html: html});
				self.showProposalDetailsView.details = self.details;
				self.showProposalDetailsView.researchers = self.researchers;
				self.showProposalDetailsView.topics = self.topics;
				self.showProposalDetailsView.legend_topics = self.legend_topics;
				self.renderDetails();
			});			
		} else this.renderDetails();
	},
	renderDetails: function() {
		if ($.trim($('#tab_proposal_details', this.el).html())) return; //already loaded
		var html = this.showProposalDetailsView.render();
//console.log(html);		
		$('#tab_proposal_details', this.el).html(html);
	},
	showPanel: function() {
//console.log(this.selectedpanel);		
		if (this.selectedpanel!=null) {
			var panel = this.loadSelectedPanel(this.selectedpanel);
			var paneltopics = this.getPanelTopics(this.topicrelevance,panel.topics);				
			if (this.showPanelDetailsView==undefined) {
				var self = this;
				require(['text!templates/proposals/show_tab_panel_details.html'], function(html) {
					self.showPanelDetailsView = new App.Views.ShowPanelDetails({html: html});
					self.showPanelDetailsView.panels_count = self.panels.length;
					self.showPanelDetailsView.legend_topics = self.legend_topics;
					self.renderPanel(panel,paneltopics);
				});
			} else {
				this.renderPanel(panel,paneltopics);
			}
		}
		else $('#tab_panel_details', this.el).html('<div class="alert">No panels</div>');
	},
	renderPanel: function(panel,paneltopics) {
		if ($.trim($('#tab_panel_details', this.el).html())) return; //already loaded
		this.showPanelDetailsView.panels_select = this.getPanelsSelect();
		this.showPanelDetailsView.topicrelevance_select = this.getTopicRelevance();
		var html = this.showPanelDetailsView.render(panel,paneltopics);
//console.log(html);			
		$('#tab_panel_details', this.el).html(html);
		//show graphs
		var reviewers = panel.reviewers;
		//gender graphs
		this.showPanelDetailsView.renderReviewerGenderGraph(reviewers,'reviewers_gender_graph');
		//institution classification
		$('#reviewers_instclass_list', this.el).html(this.showPanelDetailsView.renderReviewerInstitutionClassification(reviewers,this.legend_flags));
		//render reviewer map
		$('#reviewers_location_list', this.el).html(this.showPanelDetailsView.renderReviewerLocation(reviewers,'reviewers_location_map'));		
	},
	showReviewerExpertise: function() {
		if (this.selectedpanel!=null) {
			var panel = this.loadSelectedPanel(this.selectedpanel);
			var paneltopics = this.getPanelTopics(this.topicrelevance,panel.topics);
			if (this.showReviewerExpertiseView==undefined) {
				var self = this;
				require(['text!templates/proposals/show_tab_reviewer_expertise.html'], function(html) {
					self.showReviewerExpertiseView = new App.Views.ShowReviewerExpertise({html: html});
					self.showReviewerExpertiseView.topics = self.topics; //proposal topics
					self.showReviewerExpertiseView.legend_topics = self.legend_topics;
					self.renderReviewerExpertise(panel,paneltopics,self.topicrelevance);
				});
			} else {
				this.renderReviewerExpertise(panel,paneltopics,this.topicrelevance);
			}
		} 
		else $('#tab_reviewer_expertise', this.el).html('<div class="alert">No panels</div>');
	},
	renderReviewerExpertise: function(panel,paneltopics,topicrelevance) {
		if ($.trim($('#tab_reviewer_expertise', this.el).html())) return; //already loaded
		this.showReviewerExpertiseView.panels_select = this.getPanelsSelect();
		this.showReviewerExpertiseView.topicrelevance_select = this.getTopicRelevance();
		var html = this.showReviewerExpertiseView.render(panel,paneltopics,topicrelevance);
//console.log(html);		
		$('#tab_reviewer_expertise', this.el).html(html);		
	},
	showReviewerDetails: function() {
		if (this.selectedpanel!=null) {
			var panel = this.loadSelectedPanel(this.selectedpanel);
			if (this.showReviewerDetailsView==undefined) {
				var self = this;
				require(['text!templates/proposals/show_tab_reviewer_details.html'], function(html) {
					self.showReviewerDetailsView = new App.Views.ShowReviewerDetails({html: html});
					self.showReviewerDetailsView.legend_topics = self.legend_topics;
					self.showReviewerDetailsView.legend_flags = self.legend_flags;
					self.renderReviewerDetails(panel.reviewers);
				});
			} else {
				this.renderReviewerDetails(panel.reviewers);
			}
		} 
		else $('#tab_reviewer_details', this.el).html('<div class="alert">No panels</div>');
	},
	renderReviewerDetails: function(reviewers) {
		if ($.trim($('#tab_reviewer_details', this.el).html())) return; //already loaded
		this.showReviewerDetailsView.panels_select = this.getPanelsSelect();
		var html = this.showReviewerDetailsView.render(reviewers);
		$('#tab_reviewer_details', self.el).html(html);		
	},
	showReviewerDetail: function(e) {
		e.preventDefault();

		var nsf_id = $(e.currentTarget).attr('id');
//console.log(nsf_id);		

		var panel = this.loadSelectedPanel(this.selectedpanel);
//console.log(panel.reviewers);		
		var reviewer = _.find(panel.reviewers, function(reviewer) {
			return reviewer["nsf_id"]==nsf_id;
		});
		var html = this.showReviewerDetailsView.renderReviewerDetail(reviewer);
		$('#reviewer_detail', this.el).html(html);		
		//awards
		this.showReviewerDetailsView.renderReviewerAwards(reviewer,$('#reviewer_awards', this.el));
	},	
	getPanelsSelect: function() {
		var panels_select = '';
		var self = this;
		_.each(this.panels, function(panel) {
//console.log(self.selectedpanel);		
//console.log(panel);			
			var selected = '';
			if (panel.panel.nsf_id==self.selectedpanel.toString()) selected = ' selected ';
			panels_select += '<option value="'+panel.panel.nsf_id+'"'+selected+'>'+panel.panel.nsf_id+' - '+panel.panel.name+' ('+panel.panel.officer+')</option>';
		});
		return panels_select;
	},
	getPanelTopics: function(topicrelevance,topics) {
		var gatheredtopics = {};
		if (topics.length > 0) {
			for (var i=0;i<topicrelevance;i++) {
				_.each(topics[i],function(topic,t) {
					//if this topic is already in the list, just add the counts
					if (_.has(gatheredtopics,t)) {
						gatheredtopics[t]["count"] += topic.count;
					} else {
						gatheredtopics[t] = {};
						gatheredtopics[t]["count"] = topic.count;
					}
				});
			}
		}
//console.log(gatheredtopics);			
		return gatheredtopics;
	},
	getTopicRelevance: function() {
		var topicrelevance = '';
		topicrelevance += '<option value="1"'+(this.topicrelevance=='1'?' selected ':'')+'>Primary Topic</option>';
		topicrelevance += '<option value="2"'+(this.topicrelevance=='2'?' selected ':'')+'>Top-2 Topics</option>';
		topicrelevance += '<option value="3"'+(this.topicrelevance=='3'?' selected ':'')+'>Top-3 Topics</option>';
		topicrelevance += '<option value="4"'+(this.topicrelevance=='4'?' selected ':'')+'>All Topics</option>';
		
		return topicrelevance;
	},
	loadSelectedPanel: function(selectedpanel) {
		if (this.panels.length>0) {
//console.log(this.panels);			
			return _.find(this.panels,function(panel) {
				return panel.panel.nsf_id == selectedpanel;
			})
		} else 
			return {};
	}
});