var ids = [];

var CourseSchedule = React.createClass({displayName: "CourseSchedule",
    handleClick: function(id) {
        var subjects = this.state.subjects.slice();

        subjects.forEach(function(subject, i) {
            if (subject.Id === id) {
                subjects.splice(i, 1);

                return;
            }
        });

        var lectures = this.state.lectures.slice();

        for (var i = lectures.length - 1; i >= 0; i--) {
            if (lectures[i].Id === id) {
                lectures.splice(i, 1);
            }
        };

        this.setState({subjects: subjects, lectures: lectures});

        var index = ids.indexOf(id);
        ids.splice(index, 1);

        localStorage.setItem("subjects", JSON.stringify(ids));
    },

    addSubjects: function(subjects) {
        subjects.forEach(function(subject) {
            this.addSubject(subject);
        }.bind(this));
    },

    addSubject: function(subject) {
        if (subject.Id) {
            subject = subject.Id;
        }

        if ($.inArray(subject, ids) != -1) {
            return;
        }

        ids.push(subject);

        localStorage.setItem("subjects", JSON.stringify(ids));

        var url = "data/lectures/" + encodeURI(subject) + ".json";

        $.ajax({
            url: url,
            dataType: "json",
            cache: false,
            success: function(data) {
                var subjects = this.state.subjects.slice();
                subjects.push({Name: data.Name, Id: subject});

                subjects.sort(function(a, b) {
                    var A = a.Name.toUpperCase();
                    var B = b.Name.toUpperCase();

                    return (A < B) ? -1 : (A > B) ? 1 : 0;
                });

                var lectures = this.state.lectures.slice();

                data.Lectures.forEach(function(lecture) {
                        lecture.Id = subject;
                        lectures.push(lecture);
                }.bind(this));

                lectures.sort(function(a, b) {
                    return a.Date > b.Date;
                });

                this.setState({subjects: subjects, lectures: lectures});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },

    setDay: function(date) {
        var d = new Date(date);

        if (Object.prototype.toString.call(d) === "[object Date]") {
            if (!isNaN(d.getTime())) {
                this.setState({day: d});
            }
        }
    },

    getInitialState: function() {
        return {
            day: new Date(),
            subjects: [],
            lectures: []
        };
    },

    componentDidMount: function() {
        var subjects = localStorage.getItem("subjects");

        if (subjects !== null) {
            this.addSubjects(JSON.parse(subjects));
        }
    },

    render: function() {
        var lectures = this.state.lectures.filter(function(lecture) {
            var start = new Date(lecture.Date);

            if (start.toDateString() == this.state.day.toDateString()) {
                return lecture;
            }
        }.bind(this));

        return (
            React.createElement("div", {className: "container"}, 
                React.createElement(Controls, {day: this.state.day, subjects: this.state.subjects, onSubmit: this.addSubject, onClick: this.handleClick, onInput: this.setDay}), 
                React.createElement(LectureList, {data: lectures})
            )
        );
    }
});

var Controls = React.createClass({displayName: "Controls",
    addProgram: function(program) {
        program.Subjects.forEach(function(subject) {
            this.props.onSubmit(subject);
        }.bind(this));
    },

    render: function() {
        return(
            React.createElement("div", {className: "well"}, 
                React.createElement("label", {htmlFor: "date-input"}, "Date:"), 
                React.createElement(DateInput, {day: this.props.day, onInput: this.props.onInput}), 
                React.createElement(Selection, {type: "programs", data: this.props.programs, onSubmit: this.addProgram}), 
                React.createElement(Selection, {type: "subjects", data: this.props.subjects, onSubmit: this.props.onSubmit}), 
                React.createElement(SelectedSubjects, {data: this.props.subjects, onClick: this.props.onClick})
            )
        );
    }
});

var DateInput = React.createClass({displayName: "DateInput",
    componentDidMount: function() {
        $(this.getDOMNode()).change(function() {
            this.props.onInput(this.getDOMNode().value);
        }.bind(this));
    },

    render: function() {
        return (
            React.createElement("input", {id: "date-input", className: "form-control", type: "date", defaultValue: this.props.day.toISOString().substring(0, 10)})
        );
    }
});

var Selection = React.createClass({displayName: "Selection",
    handleSubmit: function(e) {
        e.preventDefault();

        if (this.state.list.length > 1) {
            this.props.onSubmit(this.state.list[this.refs.selection.getDOMNode().selectedIndex]);
        }
    },

    getInitialState: function() {
        return {
          list: [{Name: "Loading " + this.props.type + "..."}]
        };
    },

    componentDidMount: function() {
        $.ajax({
            url: "data/"+this.props.type+".json",
            dataType: "json",
            cache: false,
            success: function(data) {
                data.sort(function(a, b) {
                    var A = a.Name.toUpperCase();
                    var B = b.Name.toUpperCase();

                    return (A < B) ? -1 : (A > B) ? 1 : 0;
                });

                var list = data;

                // don't include duplicate programs
                if (this.props.type === "programs") {
                    var seen = new Object();
                    list = [];

                    data.forEach(function(item) {
                        if (!seen[item.Name + item.Subjects.toString()]) {
                            seen[item.Name + item.Subjects.toString()] = true;

                            // don't include empty programs
                            if (item.Subjects.length < 1) {
                                return;
                            }

                            list.push(item);
                        }
                    });
                }

                this.setState({list: list});
            }.bind(this),
            error: function(xhr, status, err) {
                this.setState({list: [{Name: "Error loading " + this.props.type + "..."}]});
            }.bind(this)
        });
    },

    render: function() {
        var options = this.state.list.map(function(option, i) {
            return (
                React.createElement("option", {key: i}, option.Name)
            );
        });

        var id = this.props.type.substring(0, this.props.type.length - 1) + "-list";
        var label = this.props.type.charAt(0).toUpperCase() + this.props.type.substring(1) + ":";

        return (
            React.createElement("form", {onSubmit: this.handleSubmit}, 
                React.createElement("div", {className: "row"}, 
                    React.createElement("div", {className: "col-lg-12"}, 
                        React.createElement("label", {htmlFor: id}, label), 

                        React.createElement("div", {className: "input-group"}, 
                            React.createElement("select", {id: id, className: "form-control", ref: "selection"}, 
                                options
                            ), 

                            React.createElement("span", {className: "input-group-btn"}, 
                                React.createElement("button", {className: "btn btn-primary", type: "submit"}, "Add")
                            )
                        )
                    )
                )
            )
        );
    }
});

var SelectedSubjects = React.createClass({displayName: "SelectedSubjects",
    render: function() {
        var selected = this.props.data.map(function(subject, i) {
            return (
                React.createElement(Subject, {subject: subject, key: i, onClick: this.props.onClick})
            );
        }.bind(this));

        return (
            React.createElement("div", {className: "selected-subjects"}, 
                selected
            )
        );
    }
});

var Subject = React.createClass({displayName: "Subject",
    render: function() {
        return (
            React.createElement("button", {className: "btn btn-danger btn-mini", onClick: this.props.onClick.bind(null, this.props.subject.Id)}, 
                this.props.subject.Name.substring(0, 8), " ", React.createElement("span", {className: "glyphicon glyphicon-remove", "aria-hidden": "true"})
            )
        );
    }
});

var LectureList = React.createClass({displayName: "LectureList",
    render: function() {
        var lectures = this.props.data.map(function(lecture, i) {
            return (
                React.createElement(Lecture, {data: lecture, key: i, href: i})
            );
        });

        return (
            React.createElement("div", {className: "list-group"}, 
                lectures
            )
        );
    }
});

var Lecture = React.createClass({displayName: "Lecture",
    handleClick: function() {
        var hidden = $(this.getDOMNode()).children("ul");
        var rooms = hidden[0];
        var lecturers = hidden[1];

        $(this.getDOMNode()).parent().find("ul:visible").not(hidden).toggle();

        if (this.props.data.Rooms.length > 1) {
            $(rooms).toggle();
        }

        if (this.props.data.Lecturers.length > 0) {
            $(lecturers).toggle();
        }
    },

    render: function() {
        var start = new Date(this.props.data.Date);
        var end = new Date(start.valueOf());
        end.setHours(end.getHours() + this.props.data.Length);

        var lectureStart = start.toTimeString().substring(0, 5);
        var lectureEnd = end.toTimeString().substring(0, 5);

        var firstRoom;
        var numRooms = this.props.data.Rooms.length;

        if (numRooms> 0) {
            firstRoom = this.props.data.Rooms[0];
        }

        rooms = this.props.data.Rooms.slice(1, numRooms).map(function(room) {
            return (
                React.createElement("li", {className: "label label-success btn-mini", key: room}, room)
            );
        });

        lecturers = this.props.data.Lecturers.map(function(lecturer) {
            return (
                React.createElement("li", {className: "label label-warning btn-mini btn-mini-long", key: lecturer}, lecturer)
            );
        });

        return (
            React.createElement("a", {name: this.props.href, href: "#" + this.props.href, className: "list-group-item", onClick: this.handleClick}, 
                React.createElement("h6", {className: "list-group-item-heading"}, 
                    this.props.data.Name, 
                    React.createElement("span", {className: "label label-primary btn-mini pull-right"}, firstRoom)
                ), 
                React.createElement("div", {className: "clearfix"}), 

                React.createElement("span", {className: "label label-info"}, lectureStart, " - ", lectureEnd), 

                React.createElement("ul", {className: "list-group"}, 
                    rooms
                ), 

                React.createElement("ul", {className: "list-group"}, 
                    lecturers
                )
            )
        );
    }
});

React.render(
    React.createElement(CourseSchedule, null),
    document.body
);
